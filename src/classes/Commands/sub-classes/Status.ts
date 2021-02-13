import SteamID from 'steamid';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';
import Bot from '../../Bot';
import { stats, profit } from '../../../lib/tools/export';
import { sendStats } from '../../../lib/DiscordWebhook/export';

// Bot status

export default class StatusCommands {
    private readonly bot: Bot;

    constructor(bot: Bot) {
        this.bot = bot;
    }

    statsCommand(steamID: SteamID): void {
        const tradesFromEnv = this.bot.options.statistics.lastTotalTrades;
        const trades = stats(this.bot);
        const profits = profit(this.bot, Math.floor((Date.now() - 86400000) / 1000)); //since -24h

        const keyPrices = this.bot.pricelist.getKeyPrices;

        const timedProfitmadeFull = Currencies.toCurrencies(profits.profitTimed, keyPrices.sell.metal).toString();
        const timedProfitmadeInRef = timedProfitmadeFull.includes('key')
            ? ` (${Currencies.toRefined(profits.profitTimed)} ref)`
            : '';

        const profitmadeFull = Currencies.toCurrencies(profits.tradeProfit, keyPrices.sell.metal).toString();
        const profitmadeInRef = profitmadeFull.includes('key')
            ? ` (${Currencies.toRefined(profits.tradeProfit)} ref)`
            : '';

        const profitOverpayFull = Currencies.toCurrencies(profits.overpriceProfit, keyPrices.sell.metal).toString();
        const profitOverpayInRef = profitOverpayFull.includes('key')
            ? ` (${Currencies.toRefined(profits.overpriceProfit)} ref)`
            : '';

        this.bot.sendMessage(
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
                `\n\n Profit (last 24h): ${timedProfitmadeFull + timedProfitmadeInRef}` +
                `\nProfit made: ${profitmadeFull + profitmadeInRef} ${
                    profits.since !== 0 ? ` (since ${pluralize('day', profits.since, true)} ago)` : ''
                }` +
                `\nProfit from overpay: ${profitOverpayFull + profitOverpayInRef}` +
                `\nKey rate: ${keyPrices.buy.metal}/${keyPrices.sell.metal} ref`
        );
    }

    statsDWCommand(steamID: SteamID): void {
        const opt = this.bot.options.discordWebhook.sendStats;

        if (!opt.enable) {
            return this.bot.sendMessage(steamID, '❌ Sending stats to Discord Webhook is disabled.');
        }

        if (opt.url === '') {
            return this.bot.sendMessage(steamID, '❌ Your discordWebhook.sendStats.url is empty.');
        }

        sendStats(this.bot, true, steamID);
    }

    inventoryCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            `🎒 My current items in my inventory: ${
                String(this.bot.inventoryManager.getInventory.getTotalItems) + '/' + String(this.bot.tf2.backpackSlots)
            }`
        );
    }

    versionCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            `Currently running TF2Autobot@v${process.env.BOT_VERSION}. Checking for a new version...`
        );

        this.bot.checkForUpdates
            .then(({ hasNewVersion, latestVersion }) => {
                if (!hasNewVersion) {
                    this.bot.sendMessage(steamID, 'You are running the latest version of TF2Autobot!');
                } else if (this.bot.lastNotifiedVersion === latestVersion) {
                    this.bot.sendMessage(
                        steamID,
                        `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.\n\n` +
                            `Release note: https://github.com/idinium96/tf2autobot/releases` +
                            `\n\nRun "!updaterepo" if you're running your bot with PM2 to update now!"` +
                            '\n\nContact IdiNium if you have any other problem. Thank you.'
                    );
                }
            })
            .catch(err => {
                this.bot.sendMessage(steamID, `❌ Failed to check for updates: ${JSON.stringify(err)}`);
            });
    }
}
