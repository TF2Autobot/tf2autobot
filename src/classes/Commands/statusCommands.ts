import SteamID from 'steamid';
import pluralize from 'pluralize';

import Bot from '../Bot';

import { stats } from '../../lib/tools/export';

// Bot status

export function statsCommand(steamID: SteamID, bot: Bot): void {
    const tradesFromEnv = bot.options.statistics.lastTotalTrades;
    const trades = stats(bot);

    bot.sendMessage(
        steamID,
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        'All trades are recorded from ' +
            pluralize('day', trades.totalDays, true) +
            ' ago 📊\n\n Total: ' +
            (tradesFromEnv !== 0 ? tradesFromEnv + trades.tradesTotal : trades.tradesTotal) +
            ' \n Last 24 hours: ' +
            trades.trades24Hours +
            ' \n Since beginning of today: ' +
            trades.tradesToday
    );
}

export function inventoryCommand(steamID: SteamID, bot: Bot): void {
    const currentItems = bot.inventoryManager.getInventory().getTotalItems();
    bot.sendMessage(
        steamID,
        // eslint-disable-next-line @typescript-eslint/restrict-plus-operands
        `🎒 My current items in my inventory: ${currentItems + '/' + bot.tf2.backpackSlots}`
    );
}

export function versionCommand(steamID: SteamID, bot: Bot): void {
    bot.sendMessage(steamID, `Currently running v${process.env.BOT_VERSION}. Checking for a new version...`);

    bot.checkForUpdates()
        .then(({ hasNewVersion, latestVersion }) => {
            if (!hasNewVersion) {
                bot.sendMessage(steamID, 'You are running the latest version!');
            } else if (bot.lastNotifiedVersion === latestVersion) {
                bot.sendMessage(
                    steamID,
                    `⚠️ Update available!` +
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
