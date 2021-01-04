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
                    `**Total days:** ${pluralize('day', trades.totalDays, true)}` +
                    `\n\n**Total accepted trades:** ${
                        tradesFromEnv !== 0 ? String(tradesFromEnv + trades.tradesTotal) : String(trades.tradesTotal)
                    }` +
                    `\n**Last 24 hours:** ${trades.trades24Hours} (${
                        trades.trades24Hours + trades.failedOrIgnored24Hours
                    } processed)` +
                    `\n**Since beginning of today:** ${trades.tradesToday} (${
                        trades.tradesToday + trades.failedOrIgnoredToday
                    } processed)` +
                    `\n\n**Profit made:** ${profitmadeFull + profitmadeInRef}` +
                    `\n**Profit from overpay:** ${profitOverpayFull + profitOverpayInRef}` +
                    `\n**Key rate:** ${keyPrices.buy.metal}/${keyPrices.sell.metal} ref`,
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
