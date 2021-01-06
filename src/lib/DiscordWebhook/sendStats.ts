import Currencies from 'tf2-currencies';
import pluralize from 'pluralize';

import { sendWebhook } from './utils';
import { Webhook } from './interfaces';

import { stats, profit, timeNow } from '../../lib/tools/export';
import log from '../logger';

import Bot from '../../classes/Bot';

export default async function sendStats(bot: Bot): Promise<void> {
    const opt = bot.options.discordWebhook;
    const botInfo = bot.handler.getBotInfo;
    const trades = await stats(bot);
    const profits = await profit(bot);
    const time = timeNow(bot.options.timezone, bot.options.customTimeFormat, bot.options.timeAdditionalNotes);

    const tradesFromEnv = bot.options.statistics.lastTotalTrades;
    const keyPrices = bot.pricelist.getKeyPrices();

    const profitmadeFull = Currencies.toCurrencies(profits.tradeProfit, keyPrices.sell.metal).toString();
    const profitmadeInRef = profitmadeFull.includes('key') ? ` (${Currencies.toRefined(profits.tradeProfit)} ref)` : '';

    const profitOverpayFull = Currencies.toCurrencies(profits.overpriceProfit, keyPrices.sell.metal).toString();
    const profitOverpayInRef = profitOverpayFull.includes('key')
        ? ` (${Currencies.toRefined(profits.overpriceProfit)} ref)`
        : '';

    const discordStats: Webhook = {
        username: opt.displayName ? opt.displayName : botInfo.name,
        avatar_url: opt.avatarURL ? opt.avatarURL : botInfo.avatarURL,
        content: '',
        embeds: [
            {
                footer: {
                    text: `${time.time}`,
                    icon_url: opt.avatarURL ? opt.avatarURL : botInfo.avatarURL
                },
                title: '📊 Statistics 📊',
                description:
                    `All trades (accepted) are recorded from **${pluralize('day', trades.totalDays, true)}** ago.` +
                    `\n**Total accepted trades:** ${
                        tradesFromEnv !== 0
                            ? String(tradesFromEnv + trades.totalAcceptedTrades)
                            : String(trades.totalAcceptedTrades)
                    }`,
                fields: [
                    {
                        name: 'Last 24 hours',
                        value:
                            `• Processed: ${trades.hours24.processed}` +
                            `\n• Accepted: ${trades.hours24.accepted}` +
                            `\n• Skipped: ${trades.hours24.skipped}` +
                            `\n• Traded away: ${trades.hours24.invalid}` +
                            `\n• Canceled: ${trades.hours24.canceled.total}` +
                            `\n---⁎ by user: ${trades.hours24.canceled.byUser}` +
                            `\n---⁎ confirmation failed: ${trades.hours24.canceled.failedConfirmation}` +
                            `\n---⁎ unknown reason: ${trades.hours24.canceled.unknown}`
                    },
                    {
                        name: 'Since beginning of today',
                        value:
                            `• Processed: ${trades.today.processed}` +
                            `\n• Accepted: ${trades.today.accepted}` +
                            `\n• Skipped: ${trades.today.skipped}` +
                            `\n• Traded away: ${trades.today.invalid}` +
                            `\n• Canceled: ${trades.today.canceled.total}` +
                            `\n---⁎ by user: ${trades.today.canceled.byUser}` +
                            `\n---⁎ confirmation failed: ${trades.today.canceled.failedConfirmation}` +
                            `\n---⁎ unknown reason: ${trades.today.canceled.unknown}`
                    },
                    {
                        name: `Profit${
                            profits.since !== 0 ? ` (since ${pluralize('day', profits.since, true)} ago)` : ''
                        }`,
                        value:
                            `• Total made: ${profitmadeFull + profitmadeInRef}` +
                            `\n• From overpay: ${profitOverpayFull + profitOverpayInRef}`
                    },
                    {
                        name: 'Key rate',
                        value: `${keyPrices.buy.metal}/${keyPrices.sell.metal} ref`
                    }
                ],
                color: opt.embedColor
            }
        ]
    };

    sendWebhook(opt.sendStats.url, discordStats, 'statistics')
        .then(() => {
            log.debug(`✅ Sent statistics webhook to Discord.`);
        })
        .catch(err => {
            log.debug(`❌ Failed to send statistics webhook to Discord: `, err);
        });
}
