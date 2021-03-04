import SteamID from 'steamid';
import { promises as fsp } from 'fs';
import sleepasync from 'sleep-async';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import { getOptionsPath, JsonOptions, removeCliOptions } from '../../Options';
import validator from '../../../lib/validator';
import log from '../../../lib/logger';
import { deepMerge } from '../../../lib/tools/deep-merge';

export type OptionsKeys =
    | 'miscSettings'
    | 'sendAlert'
    | 'pricelist'
    | 'bypass'
    | 'tradeSummary'
    | 'steamChat'
    | 'highValue'
    | 'normalize'
    | 'details'
    | 'statistics'
    | 'autokeys'
    | 'crafting'
    | 'offerReceived'
    | 'manualReview'
    | 'discordWebhook'
    | 'customMessage'
    | 'commands'
    | 'detailsExtra';

export default class OptionsCommands {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    async optionsCommand(steamID: SteamID, message: string): Promise<void> {
        const liveOptions = deepMerge({}, this.bot.options) as JsonOptions;
        // remove any CLI stuff
        removeCliOptions(liveOptions);

        const key = CommandParser.removeCommand(message);

        if (!key || key === '!options') {
            this.bot.sendMessage(
                steamID,
                `/code ${JSON.stringify(
                    {
                        miscSettings: liveOptions.miscSettings,
                        sendAlert: liveOptions.sendAlert,
                        pricelist: liveOptions.pricelist,
                        bypass: liveOptions.bypass,
                        tradeSummary: liveOptions.tradeSummary
                    },
                    null,
                    4
                )}`
            );

            await sleepasync().Promise.sleep(1 * 1000);

            this.bot.sendMessage(
                steamID,
                `/code ${JSON.stringify(
                    {
                        steamChat: liveOptions.steamChat,
                        highValue: liveOptions.highValue,
                        normalize: liveOptions.normalize,
                        details: liveOptions.details,
                        statistics: liveOptions.statistics,
                        autokeys: liveOptions.autokeys,
                        crafting: liveOptions.crafting
                    },
                    null,
                    4
                )}`
            );

            await sleepasync().Promise.sleep(1 * 1000);

            this.bot.sendMessage(
                steamID,
                `/code ${JSON.stringify(
                    {
                        offerReceived: liveOptions.offerReceived,
                        manualReview: liveOptions.manualReview
                    },
                    null,
                    4
                )}`
            );

            await sleepasync().Promise.sleep(1 * 1000);

            this.bot.sendMessage(
                steamID,
                `/code ${JSON.stringify(
                    {
                        discordWebhook: liveOptions.discordWebhook,
                        customMessage: liveOptions.customMessage
                    },
                    null,
                    4
                )}`
            );

            await sleepasync().Promise.sleep(1 * 1000);

            this.bot.sendMessage(steamID, `/code ${JSON.stringify({ commands: liveOptions.commands }, null, 4)}`);

            await sleepasync().Promise.sleep(1 * 1000);

            this.bot.sendMessage(
                steamID,
                `/code ${JSON.stringify({ detailsExtra: liveOptions.detailsExtra }, null, 4)}`
            );

            this.bot.sendMessage(
                steamID,
                `\n\nYou can also get only the part the you want by sending "!options [OptionsParentKey]"`
            );
        } else {
            const optionsKeys = Object.keys(liveOptions);

            if (!optionsKeys.includes(key)) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ "${key}" parent key does not exist in options.` +
                        `\n\nValid parent keys:\n• ` +
                        [
                            'miscSettings',
                            'sendAlert',
                            'pricelist',
                            'bypass',
                            'tradeSummary',
                            'steamChat',
                            'highValue',
                            'normalize',
                            'details',
                            'statistics',
                            'autokeys',
                            'crafting',
                            'offerReceived',
                            'manualReview',
                            'discordWebhook',
                            'customMessage',
                            'commands',
                            'detailsExtra'
                        ].join('\n• ')
                );
            }

            const show = {};

            show[key] = liveOptions[key as OptionsKeys];

            this.bot.sendMessage(steamID, `/code ${JSON.stringify(show, null, 4)}`);
        }
    }

    updateOptionsCommand(steamID: SteamID, message: string): void {
        const opt = this.bot.options;
        const params = CommandParser.parseParams(CommandParser.removeCommand(message)) as unknown;

        const optionsPath = getOptionsPath(opt.steamAccountName);
        const saveOptions = deepMerge({}, opt) as JsonOptions;
        removeCliOptions(saveOptions);

        if (Object.keys(params).length === 0) {
            const msg = '⚠️ Missing properties to update.';
            if (steamID) {
                this.bot.sendMessage(steamID, msg);
            } else {
                log.warn(msg);
            }

            return;
        }

        const knownParams = params as JsonOptions;

        if (knownParams.discordWebhook?.ownerID !== undefined) {
            // Stringify numbers
            knownParams.discordWebhook.ownerID = String(knownParams.discordWebhook.ownerID);
        }

        if (knownParams.discordWebhook?.embedColor !== undefined) {
            // Stringify numbers
            knownParams.discordWebhook.embedColor = String(knownParams.discordWebhook.embedColor);
        }

        const result: JsonOptions = deepMerge(saveOptions, knownParams);

        const errors = validator(result, 'options');
        if (errors !== null) {
            const msg = '❌ Error updating options: ' + errors.join(', ');
            if (steamID) {
                this.bot.sendMessage(steamID, msg);
            } else {
                log.error(msg);
            }

            return;
        }

        fsp.writeFile(optionsPath, JSON.stringify(saveOptions, null, 4), { encoding: 'utf8' })
            .then(() => {
                deepMerge(opt, saveOptions);
                const msg = '✅ Updated options!';

                if (knownParams.miscSettings?.game?.playOnlyTF2 === true) {
                    this.bot.client.gamesPlayed([]);
                    this.bot.client.gamesPlayed(440);
                }

                if (typeof knownParams.miscSettings?.game?.customName === 'string') {
                    this.bot.client.gamesPlayed([]);
                    this.bot.client.gamesPlayed(
                        (
                            knownParams.miscSettings?.game?.playOnlyTF2 !== undefined
                                ? knownParams.miscSettings.game.playOnlyTF2
                                : opt.miscSettings.game.playOnlyTF2
                        )
                            ? 440
                            : [knownParams.miscSettings.game.customName, 440]
                    );
                }

                if (knownParams.miscSettings?.autobump?.enable === true) {
                    this.bot.listings.setupAutorelist();
                    this.bot.handler.disableAutoRefreshListings();
                } else if (knownParams.miscSettings?.autobump?.enable === false) {
                    this.bot.listings.disableAutorelistOption();
                    this.bot.handler.enableAutoRefreshListings();
                }

                if (knownParams.statistics?.sendStats?.enable === true) {
                    this.bot.handler.sendStats();
                } else if (knownParams.statistics?.sendStats?.enable === false) {
                    this.bot.handler.disableSendStats();
                }

                if (knownParams.statistics?.sendStats?.time !== undefined) {
                    this.bot.handler.sendStats();
                }

                if (typeof knownParams.highValue !== undefined) {
                    void this.bot.inventoryManager.getInventory.fetch();
                }

                if (typeof knownParams.normalize === 'object') {
                    void this.bot.inventoryManager.getInventory.fetch();
                }

                if (typeof knownParams.autokeys === 'object') {
                    if (knownParams.autokeys.enable !== undefined && !knownParams.autokeys.enable) {
                        this.bot.handler.autokeys.disable(this.bot.pricelist.getKeyPrices);
                    }
                    this.bot.handler.autokeys.check();
                }

                if (steamID) {
                    return this.bot.sendMessage(steamID, msg);
                } else {
                    return log.info(msg);
                }
            })
            .catch(err => {
                const msg = `❌ Error saving options file to disk: ${JSON.stringify(err)}`;
                if (steamID) {
                    this.bot.sendMessage(steamID, msg);
                } else {
                    log.error(msg);
                }

                return;
            });
    }
}
