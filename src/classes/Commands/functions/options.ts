import SteamID from 'steamid';
import { promises as fsp } from 'fs';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { getOptionsPath, JsonOptions, removeCliOptions } from '../../Options';
import validator from '../../../lib/validator';
import log from '../../../lib/logger';
import { deepMerge } from '../../../lib/tools/deep-merge';

export function optionsCommand(steamID: SteamID, bot: Bot): void {
    const liveOptions = deepMerge({}, bot.options) as JsonOptions;
    // remove any CLI stuff
    removeCliOptions(liveOptions);

    const commands = liveOptions.commands;
    const detailsExtra = liveOptions.detailsExtra;
    delete liveOptions.commands;
    delete liveOptions.detailsExtra;

    const promiseDelay = (ms: number) => {
        return new Promise(resolve => setTimeout(() => resolve(), ms));
    };

    bot.sendMessage(steamID, `/code ${JSON.stringify(liveOptions, null, 4)}`);
    void promiseDelay(1000);
    bot.sendMessage(steamID, `/code ${JSON.stringify({ commands: commands }, null, 4)}`);
    void promiseDelay(1000);
    bot.sendMessage(steamID, `/code ${JSON.stringify({ detailsExtra: detailsExtra }, null, 4)}`);
}

export function updateOptionsCommand(steamID: SteamID, message: string, bot: Bot): void {
    const opt = bot.options;
    const params = CommandParser.parseParams(CommandParser.removeCommand(message)) as unknown;

    const optionsPath = getOptionsPath(opt.steamAccountName);
    const saveOptions = deepMerge({}, opt) as JsonOptions;
    removeCliOptions(saveOptions);

    if (Object.keys(params).length === 0) {
        const msg = '⚠️ Missing properties to update.';
        if (steamID) {
            bot.sendMessage(steamID, msg);
        } else {
            log.warn(msg);
        }

        return;
    }

    const knownParams = params as JsonOptions;

    if (typeof knownParams.discordWebhook === 'object') {
        if (knownParams.discordWebhook.ownerID !== undefined) {
            // THIS IS WHAT IS NEEDED ACTUALLY
            knownParams.discordWebhook.ownerID = String(knownParams.discordWebhook.ownerID);
        }
        if (knownParams.discordWebhook.displayName !== undefined) {
            knownParams.discordWebhook.displayName = String(knownParams.discordWebhook.displayName);
        }
        if (knownParams.discordWebhook.embedColor !== undefined) {
            // AND ALSO THIS
            knownParams.discordWebhook.embedColor = String(knownParams.discordWebhook.embedColor);
        }
    }

    const result: JsonOptions = deepMerge(saveOptions, knownParams);

    const errors = validator(result, 'options');
    if (errors !== null) {
        const msg = '❌ Error updating options: ' + errors.join(', ');
        if (steamID) {
            bot.sendMessage(steamID, msg);
        } else {
            log.error(msg);
        }

        return;
    }

    fsp.writeFile(optionsPath, JSON.stringify(saveOptions, null, 4), { encoding: 'utf8' })
        .then(() => {
            deepMerge(opt, saveOptions);
            const msg = '✅ Updated options!';

            if (typeof knownParams.miscSettings === 'object') {
                if (typeof knownParams.miscSettings.game === 'object') {
                    if (
                        knownParams.miscSettings.game.playOnlyTF2 !== undefined &&
                        knownParams.miscSettings.game.playOnlyTF2 === true
                    ) {
                        bot.client.gamesPlayed([]);
                        bot.client.gamesPlayed(440);
                    }

                    if (
                        knownParams.miscSettings.game.customName !== undefined &&
                        typeof knownParams.miscSettings.game.customName === 'string'
                    ) {
                        bot.client.gamesPlayed([]);
                        bot.client.gamesPlayed(
                            (
                                knownParams.miscSettings.game.playOnlyTF2 !== undefined
                                    ? knownParams.miscSettings.game.playOnlyTF2
                                    : opt.miscSettings.game.playOnlyTF2
                            )
                                ? 440
                                : [knownParams.miscSettings.game.customName, 440]
                        );
                    }
                }

                if (knownParams.miscSettings.autobump !== undefined) {
                    if (knownParams.miscSettings.autobump === true) {
                        bot.listings.setupAutorelist();
                        bot.handler.disableAutoRefreshListings();
                    } else {
                        bot.listings.disableAutorelistOption();
                        bot.handler.enableAutoRefreshListings();
                    }
                }
            }

            if (typeof knownParams.statistics === 'object') {
                if (knownParams.statistics.sendStats !== undefined) {
                    if (knownParams.statistics.sendStats.enable === true) {
                        bot.handler.sendStats();
                    } else {
                        bot.handler.disableSendStats();
                    }

                    if (knownParams.statistics.sendStats.time !== undefined) {
                        bot.handler.sendStats();
                    }
                }
            }

            if (knownParams.normalize === 'object') {
                void bot.inventoryManager.getInventory.fetch();
            }

            if (knownParams.autokeys !== undefined) {
                bot.handler.autokeys.check();
                if (knownParams.autokeys.enable !== undefined && !knownParams.autokeys.enable) {
                    bot.handler.autokeys.disable(bot.pricelist.getKeyPrices);
                }
                bot.handler.autokeys.check();
            }

            if (steamID) {
                return bot.sendMessage(steamID, msg);
            } else {
                return log.info(msg);
            }
        })
        .catch(err => {
            const msg = `❌ Error saving options file to disk: ${JSON.stringify(err)}`;
            if (steamID) {
                bot.sendMessage(steamID, msg);
            } else {
                log.error(msg);
            }

            return;
        });
}
