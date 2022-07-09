import TradeOfferManager, { CustomError } from '@tf2autobot/tradeoffer-manager';
import { sendWebhook } from './utils';
import { Webhook } from './interfaces';
import { uptime } from '../../lib/tools/export';
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
    | 'autoRemoveAssetidFailed'
    | 'autoRemoveAssetidSuccess'
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
    | 'failed-accept'
    | 'failed-decline'
    | 'failed-processing-offer'
    | 'failed-counter'
    | 'error-accept'
    | 'autoUpdatePartialPriceSuccess'
    | 'autoUpdatePartialPriceFailed'
    | 'autoResetPartialPrice'
    | 'autoResetPartialPriceBulk'
    | 'onBulkUpdatePartialPriced'
    | 'isPartialPriced'
    | 'unusualInvalidItems'
    | 'failedToUpdateOldPrices';

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
        description = `Current position: ${positionOrCount}, automatic restart initialized...\n\n${uptime()}`;
        color = '16711680'; // red
    } else if (['queue-problem-not-restart-bptf-down', 'queue-problem-not-restart-steam-maintenance'].includes(type)) {
        const isSteamDown = type === 'queue-problem-not-restart-steam-maintenance';

        title = 'Queue problem, unable to restart';
        description = `Current position: ${positionOrCount}, unable to perform automatic restart because ${
            isSteamDown ? 'Steam' : 'backpack.tf'
        } is currently down.`;
        color = '16711680'; // red
    } else if (type === 'escrow-check-failed-perform-restart') {
        title = 'Escrow check failed alert';
        description = `Current failed count: ${positionOrCount}, automatic restart initialized...\n\n${uptime()}`;
        color = '16711680'; // red
    } else if (
        ['escrow-check-failed-not-restart-bptf-down', 'escrow-check-failed-not-restart-steam-maintenance'].includes(
            type
        )
    ) {
        const isSteamDown = type === 'escrow-check-failed-not-restart-steam-maintenance';

        let errMessage = null;
        if (err !== null) {
            const errStringify = JSON.stringify(err);
            errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
        }

        title = 'Escrow check failed, unable to restart';
        description = `Current failed count: ${positionOrCount}, unable to perform automatic restart because ${
            isSteamDown ? 'Steam' : 'backpack.tf'
        } is currently down${errMessage ? `: ${errMessage as string}` : '.'}`;
        color = '16711680'; // red
    } else if (type === 'failedPM2') {
        title = 'Automatic restart failed - no PM2';
        description =
            `❌ Automatic restart failed because you're not running the bot with PM2! ` +
            `Get a VPS and run your bot with PM2: https://github.com/TF2Autobot/tf2autobot/wiki/Getting-a-VPS`;
        color = '16711680'; // red
    } else if (type === 'failedRestartError') {
        title = 'Automatic restart failed - Error';
        description = `❌ An error occurred while trying to restart: ${(err as Error).message}`;
        color = '16711680'; // red
    } else if (type === 'full-backpack') {
        title = 'Full backpack error';
        const errStringify = JSON.stringify(err);
        const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
        description = msg + `\n\nError:\n${errMessage}`;
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
    } else if (type === 'unusualInvalidItems') {
        title = 'Received Unusual bought with Generic Unusual feature';
        description = msg;
        color = '8323327'; // purple
    } else if (type === 'autoRemoveIntentSellFailed') {
        title = 'Failed to remove item(s) with intent sell';
        description = msg;
        color = '16711680'; // red
    } else if (type === 'autoRemoveAssetidFailed') {
        title = `Failed to remove item with assetid ${items[0]}`;
        description = msg;
        color = '16711680'; // red
    } else if (type === 'autoRemoveAssetidSuccess') {
        title = `✅ Automatically removed assetid ${items[0]} from price list`;
        description = msg;
        color = '32768'; // green
    } else if (type === 'autoUpdatePartialPriceSuccess') {
        title = '✅ Automatically update partially priced item';
        description = msg;
        color = '32768'; // green
    } else if (type === 'autoUpdatePartialPriceFailed') {
        title = 'Failed update item prices (Partial price update)';
        description = msg;
        color = '16711680'; // red
    } else if (type === 'autoResetPartialPrice') {
        title = '✅ Automatically reset partially priced item';
        description = msg;
        color = '8323327'; // purple
    } else if (type === 'onBulkUpdatePartialPriced') {
        title = '✅ Partial price update - bulk';
        description = msg;
        color = '16776960'; // yellow
    } else if (type === 'autoResetPartialPriceBulk') {
        title = '✅ Automatically reset partially priced item - bulk';
        description = msg;
        color = '8323327'; // purple
    } else if (type === 'autoAddPaintedItems') {
        title = 'Added painted items to sell';
        description = msg;
        color = '32768'; // green
    } else if (type === 'autoAddPaintedItemsFailed') {
        title = 'Failed to add painted items to sell';
        description = msg;
        color = '16711680'; // red
    } else if (type.includes('autokeys-')) {
        title =
            type === 'autokeys-failedToDisable'
                ? 'Failed to disable Autokeys'
                : `Failed to ${type.includes('-failedToAdd') ? 'create' : 'update'} auto ${
                      type.includes('-bank') ? 'banking' : type.includes('-buy') ? 'buying' : 'selling'
                  } for keys - Autokeys`;
        description = msg;
        color = '16711680'; // red
    } else if (type === 'failed-accept') {
        title = 'Failed to accept trade';
        description = msg + generateError(err);
        content = items[0]; // offer id
        color = '16711680'; // red
    } else if (type === 'failed-decline') {
        title = 'Failed to decline trade';
        description = msg + generateError(err);
        content = items[0]; // offer id
        color = '16711680'; // red
    } else if (type === 'error-accept') {
        title = 'Error while trying to accept mobile confirmation';
        description = msg + generateError(err);
        content = items[0]; // offer id
        color = '16711680'; // red
    } else if (type === 'failed-processing-offer') {
        title = 'Unable to process an offer';
        description =
            `Offer #${items[1]} with ${items[0]} was unable to process due to some issue with Steam.` +
            ' The offer data received was broken because our side and their side are both empty.' +
            `\nPlease manually check the offer (login as me): https://steamcommunity.com/tradeoffer/${items[1]}/` +
            `\nSend "!faccept ${items[1]}" to force accept, or "!fdecline ${items[1]}" to decline.`;
        color = '16711680'; // red
    } else if (type === 'failed-counter') {
        title = 'Failed to counter an offer';
        description = msg + generateError(err);
        content = items[0]; // offer id
        color = '16711680'; // red
    } else if (type === 'isPartialPriced') {
        title = 'Partial price update';
        description = msg;
        color = '16776960'; // yellow
    } else if (type === 'failedToUpdateOldPrices') {
        title = 'Failed to update old prices';
        description =
            `Failed to update old prices (probably because autoprice is set to true but item does not exist` +
            ` on the pricer source):\n\n${items.join('\n')}\n\nAll items above has been temporarily disabled.`;
        color = '16711680'; // red
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
                'autoRemoveAssetidFailed',
                'autoRemoveAssetidSuccess',
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
                'failed-accept',
                'error-accept',
                'unusualInvalidItems'
            ].includes(type) &&
            optDW.sendAlert.isMention &&
            optDW.ownerID.length > 0
                ? optDW.ownerID.map(id => `<@!${id}>`).join(', ')
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

    let url = optDW.sendAlert.url.main;
    if (
        [
            'autoUpdatePartialPriceSuccess',
            'autoUpdatePartialPriceFailed',
            'autoResetPartialPrice',
            'autoResetPartialPriceBulk',
            'onBulkUpdatePartialPriced',
            'isPartialPriced'
        ].includes(type)
    ) {
        url =
            optDW.sendAlert.url.partialPriceUpdate !== ''
                ? optDW.sendAlert.url.partialPriceUpdate
                : optDW.sendAlert.url.main;
    }

    sendWebhook(url, sendAlertWebhook, 'alert').catch(err =>
        log.warn(`❌ Failed to send alert webhook (${type}) to Discord: `, err)
    );
}

function generateError(err: any): string {
    return `\n\nError: ${
        (err as CustomError).eresult
            ? `[${TradeOfferManager.EResult[(err as CustomError).eresult] as string}](https://steamerrors.com/${
                  (err as CustomError).eresult
              })`
            : (err as Error).message
    }`;
}
