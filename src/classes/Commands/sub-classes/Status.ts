import SteamID from 'steamid';
import pluralize from 'pluralize';
import Currencies from '@tf2autobot/tf2-currencies';
import SKU from '@tf2autobot/tf2-sku';
import * as timersPromises from 'timers/promises';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { stats, profit, itemStats, testPriceKey } from '../../../lib/tools/export';
import { sendStats } from '../../DiscordWebhook/export';
import loadPollData, { deletePollData } from '../../../lib/tools/polldata';
import SteamTradeOfferManager from '@tf2autobot/tradeoffer-manager';

// Bot status

export default class StatusCommands {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    async statsCommand(steamID: SteamID): Promise<void> {
        const tradesFromEnv = this.bot.options.statistics.lastTotalTrades;
        const pollData = loadPollData(this.bot.handler.getPaths.files.dir);

        if (!pollData) {
            return this.bot.sendMessage(steamID, '❌ Polldata file(s) not available.');
        }

        const trades = stats(this.bot, pollData);
        const profits = await profit(this.bot, pollData, Math.floor((Date.now() - 86400000) / 1000)); //since -24h

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
                `\n• Accepted: ${trades.hours24.accepted.offer.total + trades.hours24.accepted.sent}` +
                `\n---• Received offer: ${trades.hours24.accepted.offer.total}` +
                `\n------• Countered: ${trades.hours24.accepted.offer.countered}` +
                `\n---• Sent offer: ${trades.hours24.accepted.sent}` +
                `\n• Declined: ${trades.hours24.decline.offer.total + trades.hours24.decline.sent}` +
                `\n---• Received offer: ${trades.hours24.decline.offer.total}` +
                `\n------• Countered: ${trades.hours24.decline.offer.countered}` +
                `\n---• Sent offer: ${trades.hours24.decline.sent}` +
                `\n• Skipped: ${trades.hours24.skipped}` +
                `\n• Traded away: ${trades.hours24.invalid}` +
                `\n• Canceled: ${trades.hours24.canceled.total}` +
                `\n---• by user: ${trades.hours24.canceled.byUser}` +
                `\n---• confirmation failed: ${trades.hours24.canceled.failedConfirmation}` +
                `\n---• unknown reason: ${trades.hours24.canceled.unknown}` +
                `\n\n--- Since beginning of today ---` +
                `\n• Processed: ${trades.today.processed}` +
                `\n• Accepted: ${trades.today.accepted.offer.total + trades.today.accepted.sent}` +
                `\n---• Received offer: ${trades.today.accepted.offer.total}` +
                `\n------• Countered: ${trades.today.accepted.offer.countered}` +
                `\n---• Sent offer: ${trades.today.accepted.sent}` +
                `\n• Declined: ${trades.today.decline.offer.total + trades.today.decline.sent}` +
                `\n---• Received offer: ${trades.today.decline.offer.total}` +
                `\n------• Countered: ${trades.today.decline.offer.countered}` +
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

        void sendStats(this.bot, true, steamID);
    }

    statsWipeCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.i_am_sure != 'yes_i_am') {
            return this.bot.sendMessage(
                steamID,
                `⚠️ Are you sure you want to delete all stats?` +
                    `\n- This process is irreversible and will delete the record of accepted trades!` +
                    `\n- If you're sure, try again with i_am_sure=yes_i_am as a parameter.`
            );
        }

        this.bot.sendMessage(steamID, '⚠️ Deleting all stats...');

        try {
            const pollData: SteamTradeOfferManager.PollData = this.bot.manager.pollData;

            pollData.sent = {};
            pollData.received = {};
            pollData.timestamps = {};
            pollData.offersSince = 0;
            pollData.offerData = {};

            this.bot.trades.setPollData(pollData);

            deletePollData(this.bot.handler.getPaths.files.dir);

            this.bot.sendMessage(steamID, '✅ All stats have been deleted.');

            this.bot.handler.commands.useUpdateOptionsCommand(
                steamID,
                '!config statistics.lastTotalTrades=0&statistics.startingTimeInUnix=0&statistics.lastTotalProfitMadeInRef=0&statistics.lastTotalProfitOverpayInRef=0&statistics.profitDataSinceInUnix=0'
            );
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Error while deleting stats: ${JSON.stringify(err)}`);
        }
    }

    inventoryCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            `🎒 My current items in my inventory: ${
                String(this.bot.inventoryManager.getInventory.getTotalItems) + '/' + String(this.bot.tf2.backpackSlots)
            }`
        );
    }

    async itemStatsCommand(steamID: SteamID, message: string): Promise<void> {
        message = CommandParser.removeCommand(message).trim();
        let sku = '';
        if (testPriceKey(message)) {
            sku = message;
        } else {
            sku = this.bot.schema.getSkuFromName(message);

            if (sku.includes('null') || sku.includes('undefined')) {
                return this.bot.sendMessage(
                    steamID,
                    `Invalid item name. The sku generate was ${sku}. Please report this to us on our Discord server, or create an issue on Github.`
                );
            }
        }

        let isSendSeparately = false;
        let boughtMessage = '';
        let soldMessage = '';
        let adminOnlyMessage = '';

        let reply = `Recorded sales for ${this.bot.schema.getName(SKU.fromString(sku))}\n\n`;

        const weapons = this.bot.handler.isWeaponsAsCurrency.enable
            ? this.bot.handler.isWeaponsAsCurrency.withUncraft
                ? this.bot.craftWeapons.concat(this.bot.uncraftWeapons)
                : this.bot.craftWeapons
            : [];
        if (
            !(this.bot.options.miscSettings.weaponsAsCurrency.enable && weapons.includes(sku)) &&
            !['5000;6', '5001;6', '5002;6'].includes(sku)
        ) {
            const now = Math.floor(Date.now() / 1000);
            const keyPrices = this.bot.pricelist.getKeyPrices;
            const keyPrice = keyPrices.sell.metal;

            try {
                const { bought, sold } = await itemStats(this.bot, sku);

                // ----------------------Bought calculations----------------------

                let boughtTime = Object.keys(bought).sort((a, b) => {
                    return +a - +b;
                });

                let totalBought = 0;
                let totalBoughtValue = 0;

                const boughtLastX = [
                    3600, // Past 60 minutes
                    86400, // Past 24 hours
                    604800, // Past 7 days
                    2419200 // Past 4 weeks
                ].map(c => {
                    const filteredTrades = boughtTime.filter(a => {
                        return +a >= now - c;
                    });

                    boughtTime = boughtTime.filter(time => !filteredTrades.includes(time));

                    const reducedTrades = filteredTrades.reduce((acc, a) => {
                        const boughtObj = bought[a];
                        const key = `${boughtObj.keys}+${boughtObj.metal}`;

                        if (!Object.prototype.hasOwnProperty.call(acc, key)) {
                            acc[key] = boughtObj.count;
                        } else {
                            acc[key] += boughtObj.count;
                        }

                        return acc;
                    }, {});

                    return Object.keys(reducedTrades).reduce((acc, a) => {
                        const boughtCount = reducedTrades[a] as number;

                        totalBought += boughtCount;

                        const keysAndMetal = a.split('+');

                        acc += boughtCount;
                        acc += ' @ ';

                        const sale = new Currencies({
                            keys: +keysAndMetal[0],
                            metal: +keysAndMetal[1]
                        });

                        totalBoughtValue += sale.toValue(keyPrice) * boughtCount;

                        acc += sale.toString();

                        return acc + '\n';
                    }, '');
                });

                // ----------------------Sold calculations----------------------

                let soldTime = Object.keys(sold).sort((a, b) => {
                    return +a - +b;
                });

                let totalSold = 0;
                let totalSoldValue = 0;

                const soldLastX = [
                    3600, // Past 60 minutes
                    86400, // Past 24 hours
                    604800, // Past 7 days
                    2419200 // Past 4 weeks
                ].map(c => {
                    const filteredTrades = soldTime.filter(a => {
                        return +a >= now - c;
                    });

                    soldTime = soldTime.filter(time => !filteredTrades.includes(time));

                    const reducedTrades = filteredTrades.reduce((acc, a) => {
                        const soldObj = sold[a];
                        const key = `${soldObj.keys}+${soldObj.metal}`;

                        if (!Object.prototype.hasOwnProperty.call(acc, key)) {
                            acc[key] = soldObj.count;
                        } else {
                            acc[key] += soldObj.count;
                        }

                        return acc;
                    }, {});

                    return Object.keys(reducedTrades).reduce((acc, a) => {
                        const soldCount = reducedTrades[a] as number;
                        totalSold += soldCount;

                        const keysAndMetal = a.split('+');

                        acc += soldCount;
                        acc += ' @ ';

                        const sale = new Currencies({
                            keys: +keysAndMetal[0],
                            metal: +keysAndMetal[1]
                        });

                        totalSoldValue += sale.toValue(keyPrice) * soldCount;

                        acc += sale.toString();
                        return acc + '\n';
                    }, '');
                });

                // ----------------------Sending message(s)----------------------

                const past60MinutesBoughtCount = boughtLastX[0].length;
                const past24HoursBoughtCount = boughtLastX[1].length;
                const pastWeekBoughtCount = boughtLastX[2].length;
                const past4WeeksBoughtCount = boughtLastX[3].length;

                boughtMessage =
                    `⬅️ ${totalBought} bought\n\n` +
                    (past60MinutesBoughtCount ? 'Past 60 Minutes\n' + boughtLastX[0] : '') +
                    (past24HoursBoughtCount
                        ? (past60MinutesBoughtCount ? '\n' : '') + 'Past 24 hours\n' + boughtLastX[1]
                        : '') +
                    (pastWeekBoughtCount
                        ? (past60MinutesBoughtCount || past24HoursBoughtCount ? '\n' : '') +
                          'Past 7 days\n' +
                          boughtLastX[2]
                        : '') +
                    (past4WeeksBoughtCount
                        ? (past60MinutesBoughtCount || past24HoursBoughtCount || pastWeekBoughtCount ? '\n' : '') +
                          'Past 4 weeks\n' +
                          boughtLastX[3]
                        : '');

                const past60MinutesSoldCount = soldLastX[0].length;
                const past24HoursSoldCount = soldLastX[1].length;
                const pastWeekSoldCount = soldLastX[2].length;
                const past4WeeksSoldCount = soldLastX[3].length;

                soldMessage =
                    `\n---------------------\n\n➡️ ${totalSold} sold\n\n` +
                    (past60MinutesSoldCount ? 'Past 60 minutes\n' + soldLastX[0] : '') +
                    (past24HoursSoldCount
                        ? (past60MinutesSoldCount ? '\n' : '') + 'Past 24 hours\n' + soldLastX[1]
                        : '') +
                    (pastWeekSoldCount
                        ? (past60MinutesSoldCount || past24HoursSoldCount ? '\n' : '') + 'Past 7 days\n' + soldLastX[2]
                        : '') +
                    (past4WeeksSoldCount
                        ? (past60MinutesSoldCount || past24HoursSoldCount || pastWeekSoldCount ? '\n' : '') +
                          'Past 4 weeks\n' +
                          soldLastX[3]
                        : '');

                const all = boughtMessage + soldMessage;

                const mustSendSeperately = all.length > 4000;
                if (mustSendSeperately) {
                    isSendSeparately = true;
                } else {
                    reply += boughtMessage + soldMessage;
                }

                if (this.bot.isAdmin(steamID)) {
                    // Admin only
                    const boughtValue = Currencies.toCurrencies(totalBoughtValue, keyPrice);
                    const boughtValueToString = boughtValue.toString();
                    const soldValue = Currencies.toCurrencies(totalSoldValue, keyPrice);
                    const soldValueToString = soldValue.toString();
                    const netProfit = Currencies.toCurrencies(totalSoldValue - totalBoughtValue, keyPrice);
                    const netProfitToString = netProfit.toString();

                    adminOnlyMessage =
                        '\n\nOverall past 30 days summary:' +
                        `\n• Total bought value: ${boughtValueToString}${
                            boughtValueToString.includes('key')
                                ? ` (${Currencies.toRefined(totalBoughtValue)} ref)`
                                : ''
                        }` +
                        `\n• Total sold value: ${soldValueToString}${
                            soldValueToString.includes('key') ? ` (${Currencies.toRefined(totalSoldValue)} ref)` : ''
                        }` +
                        `\n• Net profit: ${netProfitToString}${
                            netProfitToString.includes('key')
                                ? ` (${Currencies.toRefined(totalSoldValue - totalBoughtValue)} ref)`
                                : ''
                        }` +
                        `\n• Current key rate: ${keyPrices.buy.metal} ref/${keyPrices.sell.metal} ref`;

                    if (!mustSendSeperately) reply += adminOnlyMessage;
                }
            } catch (err) {
                reply = err as string;
            }
        } else {
            reply = 'Stats for currency is not enabled.';
        }

        if (isSendSeparately) {
            this.bot.sendMessage(steamID, reply);
            await timersPromises.setTimeout(1000);
            this.bot.sendMessage(steamID, boughtMessage);
            await timersPromises.setTimeout(3000);
            this.bot.sendMessage(steamID, soldMessage);

            if (adminOnlyMessage) {
                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(steamID, adminOnlyMessage);
            }
        } else this.bot.sendMessage(steamID, reply);
    }

    versionCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            `Currently running TF2Autobot@v${process.env.BOT_VERSION}. Checking for a new version...`
        );

        this.bot.checkForUpdates
            .then(async ({ hasNewVersion, latestVersion, canUpdateRepo, updateMessage, newVersionIsMajor }) => {
                if (!hasNewVersion) {
                    this.bot.sendMessage(steamID, 'You are running the latest version of TF2Autobot!');
                } else if (this.bot.lastNotifiedVersion === latestVersion) {
                    this.bot.sendMessage(
                        steamID,
                        `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.` +
                            `\n\n📰 Release note: https://github.com/TF2Autobot/tf2autobot/releases` +
                            (updateMessage ? `\n\n💬 Update message: ${updateMessage}` : '')
                    );
                    await timersPromises.setTimeout(1000);

                    if (this.bot.isCloned() && process.env.pm_id !== undefined && canUpdateRepo) {
                        return this.bot.sendMessage(
                            steamID,
                            newVersionIsMajor
                                ? '⚠️ !updaterepo is not available. Please upgrade the bot manually.'
                                : `✅ Update now with !updaterepo command now!`
                        );
                    }

                    const messages: string[] = [];

                    if (!this.bot.isCloned()) {
                        return this.bot.sendMessage(steamID, `⚠️ The bot local repository is not cloned from Github.`);
                    }

                    if (process.platform === 'win32') {
                        messages.concat([
                            '\n💻 To update run the following command inside your tf2autobot directory using Command Prompt:\n',
                            '/code rmdir /s /q node_modules dist && git reset HEAD --hard && git pull --prune && npm install --no-audit && npm run build && node dist/app.js'
                        ]);
                    } else if (['win32', 'linux', 'darwin', 'openbsd', 'freebsd'].includes(process.platform)) {
                        messages.concat([
                            '\n💻 To update run the following command inside your tf2autobot directory:\n',
                            '/code rm -r node_modules dist && git reset HEAD --hard && git pull --prune && npm install --no-audit && npm run build && pm2 restart ecosystem.json'
                        ]);
                    } else {
                        messages.concat([
                            '❌ Failed to find what OS your server is running! Kindly run the following standard command for most users inside your tf2autobot folder:\n',
                            '/code rm -r node_modules dist && git reset HEAD --hard && git pull --prune && npm install --no-audit && npm run build && pm2 restart ecosystem.json'
                        ]);
                    }

                    for (const message of messages) {
                        await timersPromises.setTimeout(1000);
                        this.bot.sendMessage(steamID, message);
                    }
                }
            })
            .catch(err => {
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                this.bot.sendMessage(steamID, `❌ Failed to check for updates: ${errMessage}`);
            });
    }
}
