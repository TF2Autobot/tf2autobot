import SteamID from 'steamid';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';

import Bot from '../../Bot';

import { stats, profit } from '../../../lib/tools/export';

// Bot status

export function statsCommand(steamID: SteamID, bot: Bot): void {
    const tradesFromEnv = bot.options.statistics.lastTotalTrades;
    const trades = stats(bot);
    const profits = profit(bot);

    const keyPrice = bot.pricelist.getKeyPrice().metal;

    const profitmadeFull = Currencies.toCurrencies(profits.tradeProfit, keyPrice).toString();
    const profitmadeInRef = profitmadeFull.includes('key') ? ` (${Currencies.toRefined(profits.tradeProfit)} ref)` : '';

    const profitOverpayFull = Currencies.toCurrencies(profits.overpriceProfit, keyPrice).toString();
    const profitOverpayInRef = profitmadeFull.includes('key')
        ? ` (${Currencies.toRefined(profits.overpriceProfit)} ref)`
        : '';

    bot.sendMessage(
        steamID,
        'All trades are recorded from ' +
            pluralize('day', trades.totalDays, true) +
            ' ago 📊\n\n Total: ' +
            (tradesFromEnv !== 0 ? String(tradesFromEnv + trades.tradesTotal) : String(trades.tradesTotal)) +
            ' \n Last 24 hours: ' +
            String(trades.trades24Hours) +
            ' \n Since beginning of today: ' +
            String(trades.tradesToday) +
            ' \n\nProfit made: ' +
            `${profitmadeFull + profitmadeInRef}` +
            ' \nProfit from overpay: ' +
            `${profitOverpayFull + profitOverpayInRef}`
    );
}

export function inventoryCommand(steamID: SteamID, bot: Bot): void {
    const currentItems = bot.inventoryManager.getInventory().getTotalItems();
    bot.sendMessage(
        steamID,
        `🎒 My current items in my inventory: ${String(currentItems) + '/' + String(bot.tf2.backpackSlots)}`
    );
}

export function versionCommand(steamID: SteamID, bot: Bot): void {
    bot.sendMessage(steamID, `Currently running TF2Autobot@v${process.env.BOT_VERSION}. Checking for a new version...`);

    bot.checkForUpdates()
        .then(({ hasNewVersion, latestVersion }) => {
            if (!hasNewVersion) {
                bot.sendMessage(steamID, 'You are running the latest version of TF2Autobot!');
            } else if (bot.lastNotifiedVersion === latestVersion) {
                bot.sendMessage(
                    steamID,
                    `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.\n\nRelease note: https://github.com/idinium96/tf2autobot/releases` +
                        `\n\nNavigate to your bot folder and run [git stash && git checkout master && git pull && npm install && npm run build] and then restart your bot.` +
                        `\nIf the update requires you to update ecosystem.json, please make sure to restart your bot with [pm2 restart ecosystem.json --update-env] command.` +
                        '\nContact IdiNium if you have any other problem. Thank you.'
                );
            }
        })
        .catch((err: Error) => {
            bot.sendMessage(steamID, `❌ Failed to check for updates: ${err.message}`);
        });
}
