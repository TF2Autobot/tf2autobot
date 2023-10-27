import Currencies from '@tf2autobot/tf2-currencies';
import pluralize from 'pluralize';
import SteamID from 'steamid';
import { sendWebhook } from './utils';
import { Webhook } from './interfaces';
import log from '../../lib/logger';
import { stats, profit, timeNow } from '../../lib/tools/export';
import Bot from '../Bot';
import loadPollData from '../../lib/tools/polldata';

export default async function sendStats(bot: Bot, forceSend = false, steamID?: SteamID): Promise<void> {
    const optDW = bot.options.discordWebhook;
    const botInfo = bot.handler.getBotInfo;
    const pollData = loadPollData(bot.handler.getPaths.files.dir);

    if (!pollData) {
        return;
    }

    const trades = stats(bot, pollData);
    const profits = await profit(bot, pollData, Math.floor((Date.now() - 86400000) / 1000));

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
        username: optDW.displayName || botInfo.name,
        avatar_url: optDW.avatarURL || botInfo.avatarURL,
        content: '',
        embeds: [
            {
                footer: {
                    text: `${timeNow(bot.options).time} • v${process.env.BOT_VERSION}`,
                    icon_url: optDW.avatarURL || botInfo.avatarURL
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
                            '\n------ Countered:' +
                            '\n--- Sent offer:' +
                            '\n**• Declined:**' +
                            '\n--- Received offer:' +
                            '\n------ Countered:' +
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
                            `\n**${trades.hours24.accepted.offer.total + trades.hours24.accepted.sent}**` +
                            `\n${trades.hours24.accepted.offer.total}` +
                            `\n${trades.hours24.accepted.offer.countered}` +
                            `\n${trades.hours24.accepted.sent}` +
                            `\n**${trades.hours24.decline.offer.total + trades.hours24.decline.sent}**` +
                            `\n${trades.hours24.decline.offer.total}` +
                            `\n${trades.hours24.decline.offer.countered}` +
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
                            `\n**${trades.today.accepted.offer.total + trades.today.accepted.sent}**` +
                            `\n${trades.today.accepted.offer.total}` +
                            `\n${trades.today.accepted.offer.countered}` +
                            `\n${trades.today.accepted.sent}` +
                            `\n**${trades.today.decline.offer.total + trades.today.decline.sent}**` +
                            `\n${trades.today.decline.offer.total}` +
                            `\n${trades.today.decline.offer.countered}` +
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
            if (forceSend) {
                bot.sendMessage(steamID, '✅ Sent statistics to Discord Webhook!');
            }
        })
        .catch(err => {
            log.warn(`❌ Failed to send statistics webhook to Discord: `, err);
            if (forceSend) {
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                bot.sendMessage(steamID, '❌ Error sending statistics to Discord Webhook: ' + errMessage);
            }
        });
}
