import async from 'async';
import SchemaManager from '@tf2autobot/tf2-schema';
import pm2 from 'pm2';
import Bot from './Bot';
import log from '../lib/logger';
import { waitForWriting } from '../lib/files';
import Options from './Options';
import { EPersonaState } from 'steam-user';
import EconItem from '@tf2autobot/tradeoffer-manager/lib/classes/EconItem.js';
import CEconItem from '@tf2autobot/steamcommunity/classes/CEconItem.js';
import TradeOffer from '@tf2autobot/tradeoffer-manager/lib/classes/TradeOffer';
import { camelCase } from 'change-case';
import IPricer from './IPricer';

const REQUIRED_OPTS = ['STEAM_ACCOUNT_NAME', 'STEAM_PASSWORD', 'STEAM_SHARED_SECRET', 'STEAM_IDENTITY_SECRET'];

export default class BotManager {
    private schemaManager: SchemaManager;

    public bot: Bot = null;

    private stopRequested = false;

    private stopRequestCount = 0;

    private stopping = false;

    private exiting = false;

    constructor(private readonly pricer: IPricer) {
        this.pricer = pricer;
        this.extendTradeOfferApis();
    }

    private extendTradeOfferApis() {
        ['getAction', 'getItemTag', 'getSKU'].forEach(v => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            EconItem.prototype[v] = require('../lib/extend/item/' + v);
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            CEconItem.prototype[v] = require('../lib/extend/item/' + v);
        });

        ['log', 'getDiff'].forEach(v => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access
            TradeOffer.prototype[v] = require('../lib/extend/offer/' + v);
        });
    }

    get isStopping(): boolean {
        return this.stopping || this.stopRequested;
    }

    get isBotReady(): boolean {
        return this.bot !== null && this.bot.isReady;
    }

    start(options: Options): Promise<void> {
        return new Promise((resolve, reject) => {
            REQUIRED_OPTS.forEach(optName => {
                if (!process.env[optName] && !options[camelCase(optName)]) {
                    return reject(new Error(`Missing required environment variable "${optName}"`));
                }
            });

            async.eachSeries(
                [
                    (callback): void => {
                        log.debug('Connecting to PM2...');
                        void this.connectToPM2().asCallback(callback);
                    },
                    (callback): void => {
                        log.info('Starting bot...');
                        this.pricer.init(options.enableSocket);
                        this.bot = new Bot(this, options, this.pricer);

                        void this.bot.start().asCallback(callback);
                    }
                ],
                (item, callback) => {
                    if (this.isStopping) {
                        // Shutdown is requested, stop the bot
                        return this.stop(null, false, false);
                    }

                    item(callback);
                },
                err => {
                    if (err) {
                        return reject(err);
                    }

                    if (this.isStopping) {
                        // Shutdown is requested, stop the bot
                        return this.stop(null, false, false);
                    }

                    this.pricer.connect(this.bot?.options.enableSocket);

                    this.schemaManager = this.bot.schemaManager;

                    return resolve();
                }
            );
        });
    }

    stop(err: Error | null, checkIfReady = true, rudely = false): void {
        log.debug('Shutdown has been initialized, stopping...', err ? { err: err.message } : undefined);

        this.stopRequested = true;
        this.stopRequestCount++;

        if (this.stopRequestCount >= 10) {
            rudely = true;
        }

        if (rudely) {
            log.warn('Forcefully exiting');
            return this.exit(err);
        }

        if (err === null && checkIfReady && this.bot !== null && !this.bot.isReady) {
            return;
        }

        if (this.stopping) {
            // We are already shutting down
            return;
        }

        this.stopping = true;

        this.cleanup();

        // TODO: Check if a poll is being made before stopping the bot

        if (this.bot === null) {
            log.debug('Bot instance was not yet created');
            return this.exit(err);
        }

        this.bot.handler.onShutdown().finally(() => {
            log.debug('Handler finished cleaning up');
            this.exit(err);
        });
    }

    stopProcess(): Promise<void> {
        return new Promise((resolve, reject) => {
            if (process.env.pm_id === undefined) {
                this.stop(null);
                return resolve();
            }

            log.warn('Stop has been requested, stopping...');

            pm2.stop(process.env.pm_id, err => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }

    restartProcess(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            // When running Docker, just signal the process to kill.
            // Setting --restart=Always will make sure the container is restarted.
            if (process.env.DOCKER !== undefined) {
                this.stop(null);
                return resolve(true);
            }

            if (process.env.pm_id === undefined) {
                return resolve(false);
            }

            log.warn('Restart has been initialized, restarting...');

            pm2.restart(process.env.pm_id, err => {
                if (err) {
                    return reject(err);
                }

                return resolve(true);
            });
        });
    }

    private cleanup(): void {
        if (this.bot !== null) {
            // Make the bot snooze on Steam, that way people will know it is not running
            this.bot.client.setPersona(EPersonaState.Snooze);
            this.bot.client.autoRelogin = false;

            // Stop polling offers
            this.bot.manager.pollInterval = -1;

            // Stop reading Discord
            this.bot.discordBot?.stop();

            // Stop updating schema
            clearTimeout(this.schemaManager?._updateTimeout);
            clearInterval(this.schemaManager?._updateInterval);
            clearInterval(this.bot.updateSchemaPropertiesInterval);

            // Stop heartbeat and inventory timers
            clearInterval(this.bot.listingManager?._heartbeatInterval);
            clearInterval(this.bot.listingManager?._inventoryInterval);

            // Stop check assetid pricelist cache
            clearInterval(this.bot.pricelist?.checkAssetidInPricelistInterval);

            // Stop reset Reputation cache
            clearInterval(this.bot.resetRepCache);
        }

        // Disconnect from socket server to stop price updates
        this.pricer.shutdown(!!this.bot?.options.enableSocket);
    }

    private exit(err: Error | null): void {
        if (this.exiting) {
            return;
        }

        this.exiting = true;

        if (this.bot !== null) {
            this.bot.manager.shutdown();
            this.bot.listingManager?.shutdown();
            this.bot.client.logOff();
        }

        log.debug('Waiting for files to be saved');
        void waitForWriting().then(() => {
            log.debug('Done waiting for files');

            log.on('finish', () => {
                // Logger has finished, exit the process
                process.exit(err ? 1 : 0);
            });

            log.warn('Exiting...');

            // Stop the logger
            log.end();
        });
    }

    connectToPM2(): Promise<void> {
        return new Promise((resolve, reject) => {
            pm2.connect(err => {
                if (err) {
                    return reject(err);
                }

                return resolve();
            });
        });
    }
}
