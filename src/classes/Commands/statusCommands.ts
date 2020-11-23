import SteamID from 'steamid';
import pluralize from 'pluralize';

import Bot from '../Bot';
import MyHandler from '../MyHandler/MyHandler';

import { stats } from '../../lib/tools/export';

// Bot status

export function statsCommand(steamID: SteamID, bot: Bot): void {
    const tradesFromEnv = bot.options.statistics.lastTotalTrades;
    const trades = stats(bot);

    bot.sendMessage(
        steamID,
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
    const backpackSlots = (bot.handler as MyHandler).getBackpackSlots();

    bot.sendMessage(
        steamID,
        `🎒 My current items in my inventory: ${currentItems + (backpackSlots !== 0 ? '/' + backpackSlots : '')}`
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
                        `\n\nNavigate to your bot folder and run [git checkout master && git reset HEAD --hard && git pull && npm install && npm run build] and then restart your bot.` +
                        `\nIf the update requires you to update ecosystem.json, please make sure to restart your bot with [pm2 restart ecosystem.json --update-env] command.` +
                        '\nContact IdiNium if you have any other problem. Thank you.'
                );
            }
        })
        .catch(err => {
            bot.sendMessage(steamID, `❌ Failed to check for updates: ${err.message}`);
        });
}
