import Currencies from 'tf2-currencies';
import pluralize from 'pluralize';
import SteamID from 'steamid';
import { sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../logger';
import { stats, profit, timeNow } from '../../lib/tools/export';
import Bot from '../../classes/Bot';

export default function sendStats(bot: Bot, forceSend = false, steamID?: SteamID): void {
    const optDW = bot.options.discordWebhook;
    const botInfo = bot.handler.getBotInfo;
    const trades = stats(bot);
    const profits = profit(bot, Math.floor((Date.now() - 86400000) / 1000));

    const tradesFromEnv = bot.options.statistics.lastTotalTrades;
    const keyPrices = bot.pricelist.getKeyPrices;

    const timedProfitmadeFull = Currencies.toCurrencies(profits.profitTimed, keyPrices.sell.metal).toString();
    const timedProfitmadeInRef = timedProfitmadeFull.includes('key')
        ? ` (${Currencies.toRefined(profits.profitTimed)} ref)`
        : '';

    const profitMadeFull = Currencies.toCurrencies(profits.tradeProfit, keyPrices.sell.metal).toString();
    const profitMadeInRef = profitMadeFull.includes('key') ? ` (${Currencies.toRefined(profits.tradeProfit)} ref)` : '';

    const profitOverpayFull = Currencies.toCurrencies(profits.overpriceProfit, keyPrices.sell.metal).toString();
    const profitOverpayInRef = profitOverpayFull.includes('key')
        ? ` (${Currencies.toRefined(profits.overpriceProfit)} ref)`
        : '';

    const discordStats: Webhook = {
        username: optDW.displayName ? optDW.displayName : botInfo.name,
        avatar_url: optDW.avatarURL ? optDW.avatarURL : botInfo.avatarURL,
        content: '',
        embeds: [
            {
                footer: {
                    text: `${timeNow(bot.options).time} • v${process.env.BOT_VERSION}`,
                    icon_url: optDW.avatarURL ? optDW.avatarURL : botInfo.avatarURL
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
                        name: '__Type/Duration__',
                        value:
                            '**• Processed:**' +
                            '\n**• Accepted:**' +
                            '\n--- Received offer:' +
                            '\n--- Sent offer:' +
                            '\n**• Declined:**' +
                            '\n--- Received offer:' +
                            '\n--- Sent offer:' +
                            '\n**• Skipped:**' +
                            '\n**• Traded away:**' +
                            '\n**• Canceled:**' +
                            '\n--- by user:' +
                            '\n--- confirmation failed:' +
                            '\n--- unknown reason:',
                        inline: true
                    },
                    {
                        name: '__< 24 hours__',
                        value:
                            `**${trades.hours24.processed}**` +
                            `\n**${trades.hours24.accepted.offer + trades.hours24.accepted.sent}**` +
                            `\n${trades.hours24.accepted.offer}` +
                            `\n${trades.hours24.accepted.sent}` +
                            `\n**${trades.hours24.decline.offer + trades.hours24.decline.sent}**` +
                            `\n${trades.hours24.decline.offer}` +
                            `\n${trades.hours24.decline.sent}` +
                            `\n**${trades.hours24.skipped}**` +
                            `\n**${trades.hours24.invalid}**` +
                            `\n**${trades.hours24.canceled.total}**` +
                            `\n${trades.hours24.canceled.byUser}` +
                            `\n${trades.hours24.canceled.failedConfirmation}` +
                            `\n${trades.hours24.canceled.unknown}`,
                        inline: true
                    },
                    {
                        name: '__Today__',
                        value:
                            `**${trades.today.processed}**` +
                            `\n**${trades.today.accepted.offer + trades.today.accepted.sent}**` +
                            `\n${trades.today.accepted.offer}` +
                            `\n${trades.today.accepted.sent}` +
                            `\n**${trades.today.decline.offer + trades.today.decline.sent}**` +
                            `\n${trades.today.decline.offer}` +
                            `\n${trades.today.decline.sent}` +
                            `\n**${trades.today.skipped}**` +
                            `\n**${trades.today.invalid}**` +
                            `\n**${trades.today.canceled.total}**` +
                            `\n${trades.today.canceled.byUser}` +
                            `\n${trades.today.canceled.failedConfirmation}` +
                            `\n${trades.today.canceled.unknown}`,
                        inline: true
                    },
                    {
                        name: `__Profit${
                            profits.since !== 0 ? ` (since ${pluralize('day', profits.since, true)} ago)__` : '__'
                        }`,
                        value:
                            `• Last 24 hours: ${timedProfitmadeFull + timedProfitmadeInRef}` +
                            `\n• Total made: ${profitMadeFull + profitMadeInRef}` +
                            `\n• From overpay: ${profitOverpayFull + profitOverpayInRef}`
                    },
                    {
                        name: '__Key rate__',
                        value: `${keyPrices.buy.metal}/${keyPrices.sell.metal} ref`
                    }
                ],
                color: optDW.embedColor
            }
        ]
    };

    sendWebhook(optDW.sendStats.url, discordStats, 'statistics')
        .then(() => {
            log.debug(`✅ Sent statistics webhook to Discord.`);
            if (forceSend) {
                bot.sendMessage(steamID, '✅ Sent statistics to Discord Webhook!');
            }
        })
        .catch(err => {
            log.debug(`❌ Failed to send statistics webhook to Discord: `, err);
            if (forceSend) {
                bot.sendMessage(steamID, '❌ Error sending statistics to Discord Webhook: ' + JSON.stringify(err));
            }
        });
}
