import SteamID from 'steamid';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';

import Bot from '../../Bot';

import { stats, profit } from '../../../lib/tools/export';
import { sendStats } from '../../../lib/DiscordWebhook/export';

// Bot status

export async function statsCommand(steamID: SteamID, bot: Bot): Promise<void> {
    const tradesFromEnv = bot.options.statistics.lastTotalTrades;
    const trades = await stats(bot);
    const profits = await profit(bot);

    const keyPrices = bot.pricelist.getKeyPrices;

    const profitmadeFull = Currencies.toCurrencies(profits.tradeProfit, keyPrices.sell.metal).toString();
    const profitmadeInRef = profitmadeFull.includes('key') ? ` (${Currencies.toRefined(profits.tradeProfit)} ref)` : '';

    const profitOverpayFull = Currencies.toCurrencies(profits.overpriceProfit, keyPrices.sell.metal).toString();
    const profitOverpayInRef = profitOverpayFull.includes('key')
        ? ` (${Currencies.toRefined(profits.overpriceProfit)} ref)`
        : '';

    bot.sendMessage(
        steamID,
        `All trades (accepted) are recorded from ${pluralize('day', trades.totalDays, true)}` +
            ' ago 📊\n Total accepted trades: ' +
            (tradesFromEnv !== 0
                ? String(tradesFromEnv + trades.totalAcceptedTrades)
                : String(trades.totalAcceptedTrades)) +
            `\n\n--- Last 24 hours ---` +
            `\n• Processed: ${trades.hours24.processed}` +
            `\n• Accepted: ${trades.hours24.accepted.offer + trades.hours24.accepted.sent}` +
            `\n---• Received offer: ${trades.hours24.accepted.offer}` +
            `\n---• Sent offer: ${trades.hours24.accepted.sent}` +
            `\n• Declined: ${trades.hours24.decline.offer + trades.hours24.decline.sent}` +
            `\n---• Received offer: ${trades.hours24.decline.offer}` +
            `\n---• Sent offer: ${trades.hours24.decline.sent}` +
            `\n• Skipped: ${trades.hours24.skipped}` +
            `\n• Traded away: ${trades.hours24.invalid}` +
            `\n• Canceled: ${trades.hours24.canceled.total}` +
            `\n---• by user: ${trades.hours24.canceled.byUser}` +
            `\n---• confirmation failed: ${trades.hours24.canceled.failedConfirmation}` +
            `\n---• unknown reason: ${trades.hours24.canceled.unknown}` +
            `\n\n--- Since beginning of today ---` +
            `\n• Processed: ${trades.today.processed}` +
            `\n• Accepted: ${trades.today.accepted.offer + trades.today.accepted.sent}` +
            `\n---• Received offer: ${trades.today.accepted.offer}` +
            `\n---• Sent offer: ${trades.today.accepted.sent}` +
            `\n• Declined: ${trades.today.decline.offer + trades.today.decline.sent}` +
            `\n---• Received offer: ${trades.today.decline.offer}` +
            `\n---• Sent offer: ${trades.today.decline.sent}` +
            `\n• Skipped: ${trades.today.skipped}` +
            `\n• Traded away: ${trades.today.invalid}` +
            `\n• Canceled: ${trades.today.canceled.total}` +
            `\n---• by user: ${trades.today.canceled.byUser}` +
            `\n---• confirmation failed: ${trades.today.canceled.failedConfirmation}` +
            `\n---• unknown reason: ${trades.today.canceled.unknown}` +
            `\n\nProfit made: ${profitmadeFull + profitmadeInRef} ${
                profits.since !== 0 ? ` (since ${pluralize('day', profits.since, true)} ago)` : ''
            }` +
            `\nProfit from overpay: ${profitOverpayFull + profitOverpayInRef}` +
            `\nKey rate: ${keyPrices.buy.metal}/${keyPrices.sell.metal} ref`
    );
}

export function statsDWCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.discordWebhook.sendStats;

    if (!opt.enable) {
        bot.sendMessage(steamID, '❌ Sending stats to Discord Webhook is disabled.');
        return;
    }

    if (opt.url === '') {
        bot.sendMessage(steamID, '❌ Your discordWebhook.sendStats.url is empty.');
        return;
    }

    void sendStats(bot)
        .then(() => {
            bot.sendMessage(steamID, '✅ Sent statistics to Discord Webhook!');
        })
        .catch(err => {
            bot.sendMessage(steamID, '❌ Error sending statistics to Discord Webhook: ' + JSON.stringify(err));
        });
}

export function inventoryCommand(steamID: SteamID, bot: Bot): void {
    const currentItems = bot.inventoryManager.getInventory().getTotalItems;
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
                        `\n\nNavigate to your bot folder and run [git reset HEAD --hard && git checkout master && git pull && npm install && npm run build] and then restart your bot.` +
                        `\nIf the update requires you to update ecosystem.json, please make sure to restart your bot with [pm2 restart ecosystem.json --update-env] command.` +
                        '\nContact IdiNium if you have any other problem. Thank you.'
                );
            }
        })
        .catch((err: Error) => {
            bot.sendMessage(steamID, `❌ Failed to check for updates: ${err.message}`);
        });
}
