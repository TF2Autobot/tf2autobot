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

    // Format raw profit (24h) - keys and metal shown separately
    const rawProfit24h =
        profits.rawProfitTimed.keys !== 0
            ? `${profits.rawProfitTimed.keys > 0 ? '+' : ''}${profits.rawProfitTimed.keys} keys, ${
                  profits.rawProfitTimed.metal > 0 ? '+' : ''
              }${profits.rawProfitTimed.metal.toFixed(2)} ref`
            : `${profits.rawProfitTimed.metal > 0 ? '+' : ''}${profits.rawProfitTimed.metal.toFixed(2)} ref`;

    // Format total raw profit - keys and metal shown separately
    const rawProfitTotal =
        profits.rawProfit.keys !== 0
            ? `${profits.rawProfit.keys > 0 ? '+' : ''}${profits.rawProfit.keys} keys, ${
                  profits.rawProfit.metal > 0 ? '+' : ''
              }${profits.rawProfit.metal.toFixed(2)} ref`
            : `${profits.rawProfit.metal > 0 ? '+' : ''}${profits.rawProfit.metal.toFixed(2)} ref`;

    // Format overpay profits
    const overpay24h = `${profits.overpriceProfitTimed > 0 ? '+' : ''}${profits.overpriceProfitTimed.toFixed(2)} ref`;
    const overpayTotal = `${profits.overpriceProfit > 0 ? '+' : ''}${profits.overpriceProfit.toFixed(2)} ref`;

    // Calculate full profit (raw + overpay) for clean converted display
    const fullProfit24hScrap =
        profits.rawProfitTimed.keys * keyPrices.sell.metal * 9 +
        profits.rawProfitTimed.metal * 9 +
        profits.overpriceProfitTimed * 9;
    const fullProfit24h = Currencies.toCurrencies(Math.round(fullProfit24hScrap), keyPrices.sell.metal).toString();

    const fullProfitTotalScrap =
        profits.rawProfit.keys * keyPrices.sell.metal * 9 + profits.rawProfit.metal * 9 + profits.overpriceProfit * 9;
    const fullProfitTotal = Currencies.toCurrencies(Math.round(fullProfitTotalScrap), keyPrices.sell.metal).toString();

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
                            `**Last 24 hours:**` +
                            `\n• Profit Raw: ${rawProfit24h}` +
                            `\n• Overpay: ${overpay24h}` +
                            `\n\n**All Time:**` +
                            `\n• Profit Raw: ${rawProfitTotal}` +
                            `\n• Overpay: ${overpayTotal}` +
                            `\n\n**Total Profit (Clean Converted):**` +
                            `\n• Last 24h: ${fullProfit24h}` +
                            `\n• All Time: ${fullProfitTotal}` +
                            (profits.hasEstimates ? `\n\n⚠️ Contains estimates` : '')
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
