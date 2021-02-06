import { sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../logger';
import { timeNow } from '../tools/time';
import Bot from '../../classes/Bot';

type AlertType =
    | 'lowPure'
    | 'queue-problem-perform-restart'
    | 'queue-problem-not-restart-bptf-down'
    | 'queue-problem-not-restart-steam-maintenance'
    | 'failedPM2'
    | 'failedRestartError'
    | 'full-backpack'
    | 'highValuedDisabled'
    | 'highValuedInvalidItems'
    | 'autoRemoveIntentSellFailed'
    | 'autokeys-failedToDisable'
    | 'autokeys-failedToAdd-bank'
    | 'autokeys-failedToAdd-sell'
    | 'autokeys-failedToAdd-buy'
    | 'autokeys-failedToUpdate-bank'
    | 'autokeys-failedToUpdate-sell'
    | 'autokeys-failedToUpdate-buy'
    | 'escrow-check-failed-perform-restart'
    | 'escrow-check-failed-not-restart-bptf-down'
    | 'escrow-check-failed-not-restart-steam-maintenance'
    | 'tryingToTake'
    | 'autoAddPaintedItems'
    | 'autoAddPaintedItemsFailed'
    | 'failed-accept';

export default function sendAlert(
    type: AlertType,
    bot: Bot,
    msg: string | null = null,
    positionOrCount: number | null = null,
    err: any | null = null,
    items: string[] | null = null
): void {
    let title: string;
    let description: string;
    let color: string;
    let footer: string;
    let content: string;

    if (type === 'lowPure') {
        title = 'Low Pure Alert';
        description = msg;
        color = '16776960'; // yellow
    } else if (type === 'queue-problem-perform-restart') {
        title = 'Queue Problem Alert';
        description = `Current position: ${positionOrCount}, automatic restart initialized...`;
        color = '16711680'; // red
    } else if (
        type === 'queue-problem-not-restart-bptf-down' ||
        type === 'queue-problem-not-restart-steam-maintenance'
    ) {
        const isSteamDown = type === 'queue-problem-not-restart-steam-maintenance';

        title = 'Queue problem, unable to restart';
        description = `Current position: ${positionOrCount}, unable to perform automatic restart because ${
            isSteamDown ? 'Steam' : 'backpack.tf'
        } is currently down.`;
        color = '16711680'; // red
    } else if (type === 'escrow-check-failed-perform-restart') {
        title = 'Escrow check failed alert';
        description = `Current failed count: ${positionOrCount}, automatic restart initialized...`;
        color = '16711680'; // red
    } else if (
        type === 'escrow-check-failed-not-restart-bptf-down' ||
        type === 'escrow-check-failed-not-restart-steam-maintenance'
    ) {
        const isSteamDown = type === 'escrow-check-failed-not-restart-steam-maintenance';

        title = 'Escrow check failed, unable to restart';
        description = `Current failed count: ${positionOrCount}, unable to perform automatic restart because ${
            isSteamDown ? 'Steam' : 'backpack.tf'
        } is currently down.`;
        color = '16711680'; // red
    } else if (type === 'failedPM2') {
        title = 'Automatic restart failed - no PM2';
        description =
            `❌ Automatic restart failed because you're not running the bot with PM2! ` +
            `Get a VPS and run your bot with PM2: https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS`;
        color = '16711680'; // red
    } else if (type === 'failedRestartError') {
        title = 'Automatic restart failed - Error';
        description = `❌ An error occurred while trying to restart: ${JSON.stringify(err)}`;
        color = '16711680'; // red
    } else if (type === 'full-backpack') {
        title = 'Full backpack error';
        description = msg + `\n\nError:\n${JSON.stringify(err)}`;
        color = '16711680'; // red
        footer = `${items[1] ? `#${items[1]} • ` : ''}${items[0]} • `; // 0 - steamID, 1 - trade offer id
    } else if (type === 'highValuedDisabled') {
        title = 'Temporarily disabled items with High value attachments';
        description = msg;
        color = '8323327'; // purple
    } else if (type === 'highValuedInvalidItems') {
        title = 'Received High-value invalid item(s)';
        description = msg;
        color = '8323327'; // purple
    } else if (type === 'autoRemoveIntentSellFailed') {
        title = 'Failed to remove item(s) with intent sell';
        description = msg;
        color = '8323327'; // red
    } else if (type === 'autoAddPaintedItems') {
        title = 'Added painted items to sell';
        description = msg;
        color = '32768'; // green
    } else if (type === 'autoAddPaintedItemsFailed') {
        title = 'Failed to add painted items to sell';
        description = msg;
        color = '8323327'; // red
    } else if (type.includes('autokeys-')) {
        title =
            type === 'autokeys-failedToDisable'
                ? 'Failed to disable Autokeys'
                : `Failed to ${type.includes('-failedToAdd') ? 'create' : 'update'} auto ${
                      type.includes('-bank') ? 'banking' : type.includes('-buy') ? 'buying' : 'selling'
                  } for keys - Autokeys`;
        description = msg;
        color = '8323327'; // red
    } else if (type === 'failed-accept') {
        title = 'Failed to accept trade';
        description = msg + `\n\nError:\n${JSON.stringify(err)}`;
        content = items[0]; // offer id
        color = '8323327'; // red
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
            ([
                'highValue',
                'highValuedDisabled',
                'highValuedInvalidItems',
                'failedRestartError',
                'autoRemoveIntentSellFailed',
                'autokeys-failedToDisable',
                'autokeys-failedToAdd-bank',
                'autokeys-failedToAdd-sell',
                'autokeys-failedToAdd-buy',
                'autokeys-failedToUpdate-bank',
                'autokeys-failedToUpdate-sell',
                'autokeys-failedToUpdate-buy',
                'escrow-check-failed-not-restart-bptf-down',
                'queue-problem-not-restart-bptf-down',
                'autoAddPaintedItemsFailed',
                'failed-accept'
            ].includes(type) && optDW.sendAlert.isMention
                ? `<@!${optDW.ownerID}>`
                : '') + (content ? ` - ${content}` : ''),
        embeds: [
            {
                title: title,
                description: description,
                color: color,
                footer: {
                    text: `${footer ? `${footer} • ` : ''}${timeNow(bot.options).time} • v${process.env.BOT_VERSION}`
                }
            }
        ]
    };

    sendWebhook(optDW.sendAlert.url, sendAlertWebhook, 'alert')
        .then(() => log.debug(`✅ Sent alert webhook (${type}) to Discord.`))
        .catch(err => log.debug(`❌ Failed to send alert webhook (${type}) to Discord: `, err));
}
