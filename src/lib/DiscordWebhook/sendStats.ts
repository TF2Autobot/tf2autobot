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
    const keyPrices = bot.pricelist.getKeyPrices;

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
                        name: 'Type/Duration',
                        value:
                            '• Processed:' +
                            '\n• Accepted:' +
                            '\n---• Received offer:' +
                            '\n---• Sent offer:' +
                            '\n• Declined: ' +
                            '\n---• Received offer:' +
                            '\n---• Sent offer:' +
                            '\n• Skipped:' +
                            '\n• Traded away:' +
                            '\n• Canceled:' +
                            '\n---• by user:' +
                            '\n---• confirmation failed:' +
                            '\n---• unknown reason:',
                        inline: true
                    },
                    {
                        name: 'Last 24 hours',
                        value:
                            `${trades.hours24.processed}` +
                            `\n${trades.hours24.accepted.offer + trades.hours24.accepted.sent}` +
                            `\n${trades.hours24.accepted.offer}` +
                            `\n${trades.hours24.accepted.sent}` +
                            `\n${trades.hours24.decline.offer + trades.hours24.decline.sent}` +
                            `\n${trades.hours24.decline.offer}` +
                            `\n${trades.hours24.decline.sent}` +
                            `\n${trades.hours24.skipped}` +
                            `\n${trades.hours24.invalid}` +
                            `\n${trades.hours24.canceled.total}` +
                            `\n${trades.hours24.canceled.byUser}` +
                            `\n${trades.hours24.canceled.failedConfirmation}` +
                            `\n${trades.hours24.canceled.unknown}`,
                        inline: true
                    },
                    {
                        name: 'Since beginning of today',
                        value:
                            `${trades.today.processed}` +
                            `\n${trades.today.accepted.offer + trades.today.accepted.sent}` +
                            `\n${trades.today.accepted.offer}` +
                            `\n${trades.today.accepted.sent}` +
                            `\n${trades.today.decline.offer + trades.today.decline.sent}` +
                            `\n${trades.today.decline.offer}` +
                            `\n${trades.today.decline.sent}` +
                            `\n${trades.today.skipped}` +
                            `\n${trades.today.invalid}` +
                            `\n${trades.today.canceled.total}` +
                            `\n${trades.today.canceled.byUser}` +
                            `\n${trades.today.canceled.failedConfirmation}` +
                            `\n${trades.today.canceled.unknown}`,
                        inline: true
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
