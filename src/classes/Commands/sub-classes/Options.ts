import SteamID from 'steamid';
import { promises as fsp } from 'fs';
import * as timersPromises from 'timers/promises';
import { removeLinkProtocol } from '../functions/utils';
import Bot from '../../Bot';
import Inventory from '../../Inventory';
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

let isSending = false;

export default class OptionsCommands {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    async optionsCommand(steamID: SteamID, message: string): Promise<void> {
        if (isSending) {
            return this.bot.sendMessage(steamID, '❌ Please wait.');
        }

        const liveOptions = deepMerge({}, this.bot.options) as JsonOptions;
        // remove any CLI stuff
        removeCliOptions(liveOptions);

        const optKey = CommandParser.removeCommand(message);

        const optionsKeys = Object.keys(liveOptions);

        if (!optKey) {
            return this.bot.sendMessage(
                steamID,
                '❌ Wrong syntax. Please include any valid options parent key.\nExample: "!options miscSettings"' +
                    '\n\nValid options parent keys:\n• ' +
                    optionsKeys.join('\n• ')
            );
        } else {
            if (!optionsKeys.includes(optKey)) {
                isSending = false;
                return this.bot.sendMessage(
                    steamID,
                    `❌ "${optKey}" parent key does not exist in options.` +
                        `\n\nValid parent keys:\n• ` +
                        optionsKeys.join('\n• ')
                );
            }

            // hard-coding bad 🙄

            isSending = true;

            if (optKey === 'tradeSummary') {
                const webhook = liveOptions['tradeSummary'];
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            tradeSummary: {
                                declinedTrade: webhook.declinedTrade,
                                showStockChanges: webhook.showStockChanges,
                                showTimeTakenInMS: webhook.showTimeTakenInMS,
                                showDetailedTimeTaken: webhook.showDetailedTimeTaken,
                                showItemPrices: webhook.showItemPrices,
                                showPureInEmoji: webhook.showPureInEmoji,
                                showProperName: webhook.showProperName
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                const ct = webhook.customText;
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            tradeSummary: {
                                customText: {
                                    summary: ct.summary,
                                    asked: ct.asked,
                                    offered: ct.offered
                                }
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            tradeSummary: {
                                customText: {
                                    profitFromOverpay: ct.profitFromOverpay,
                                    lossFromUnderpay: ct.lossFromUnderpay
                                }
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            tradeSummary: {
                                customText: {
                                    timeTaken: ct.timeTaken,
                                    keyRate: ct.keyRate,
                                    pureStock: ct.pureStock,
                                    totalItems: ct.totalItems
                                }
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            tradeSummary: {
                                customText: {
                                    spells: ct.spells,
                                    strangeParts: ct.strangeParts,
                                    killstreaker: ct.killstreaker,
                                    sheen: ct.sheen,
                                    painted: ct.painted
                                }
                            }
                        },
                        null,
                        2
                    )}`
                );
            } else if (optKey === 'offerReceived') {
                const webhook = liveOptions['offerReceived'];
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            offerReceived: {
                                sendPreAcceptMessage: webhook.sendPreAcceptMessage,
                                alwaysDeclineNonTF2Items: webhook.alwaysDeclineNonTF2Items,
                                invalidValue: webhook.invalidValue
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            offerReceived: {
                                invalidItems: webhook.invalidItems,
                                disabledItems: webhook.disabledItems
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            offerReceived: {
                                overstocked: webhook.overstocked,
                                understocked: webhook.understocked
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            offerReceived: {
                                duped: webhook.duped,
                                escrowCheckFailed: webhook.escrowCheckFailed,
                                bannedCheckFailed: webhook.bannedCheckFailed
                            }
                        },
                        null,
                        2
                    )}`
                );
            } else if (optKey === 'manualReview') {
                const webhook = liveOptions['manualReview'];
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            manualReview: {
                                enable: webhook.enable,
                                showOfferSummary: webhook.showOfferSummary,
                                showReviewOfferNote: webhook.showReviewOfferNote,
                                showOwnerCurrentTime: webhook.showOwnerCurrentTime,
                                showItemPrices: webhook.showItemPrices
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            manualReview: {
                                invalidValue: webhook.invalidValue,
                                invalidItems: webhook.invalidItems,
                                disabledItems: webhook.disabledItems
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            manualReview: {
                                overstocked: webhook.overstocked,
                                understocked: webhook.understocked,
                                duped: webhook.duped,
                                dupedCheckFailed: webhook.dupedCheckFailed
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            manualReview: {
                                escrowCheckFailed: webhook.escrowCheckFailed,
                                bannedCheckFailed: webhook.bannedCheckFailed,
                                additionalNotes: webhook.additionalNotes
                            }
                        },
                        null,
                        2
                    )}`
                );
            } else if (optKey === 'discordWebhook') {
                /*
                const webhook = liveOptions['discordWebhook'];
                const webhookKeys = Object.keys(webhook);
                const webhookCount = webhookKeys.length;
    
                for (let j = 0; j < webhookCount; j++) {
                    const obj = {};
                    obj[webhookKeys[j]] = webhook[webhookKeys[j] as DiscordWebhookKeys];
                    this.bot.sendMessage(steamID, `/code ${JSON.stringify({ discordWebhook: obj }, null, 2)}`);
    
                    await timersPromises.setTimeout(2000);
                }
                */

                const webhook = liveOptions['discordWebhook'];
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            discordWebhook: {
                                ownerID: webhook.ownerID,
                                displayName: webhook.displayName,
                                avatarURL: webhook.avatarURL,
                                embedColor: webhook.embedColor
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            discordWebhook: {
                                tradeSummary: webhook.tradeSummary
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            discordWebhook: {
                                declinedTrade: webhook.declinedTrade,
                                offerReview: webhook.offerReview
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            discordWebhook: {
                                messages: webhook.messages,
                                priceUpdate: webhook.priceUpdate
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            discordWebhook: {
                                sendAlert: webhook.sendAlert,
                                sendStats: webhook.sendStats
                            }
                        },
                        null,
                        2
                    )}`
                );
            } else if (optKey === 'customMessage') {
                const webhook = liveOptions['customMessage'];
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            customMessage: {
                                sendOffer: webhook.sendOffer,
                                welcome: webhook.welcome,
                                commandNotFound: webhook.commandNotFound,
                                success: webhook.success,
                                successEscrow: webhook.successEscrow
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            customMessage: {
                                decline: webhook.decline
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            customMessage: {
                                accepted: webhook.accepted
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            customMessage: {
                                tradedAway: webhook.tradedAway,
                                failedMobileConfirmation: webhook.failedMobileConfirmation,
                                cancelledActiveForAwhile: webhook.cancelledActiveForAwhile,
                                clearFriends: webhook.clearFriends
                            }
                        },
                        null,
                        2
                    )}`
                );
            } else if (optKey === 'commands') {
                const webhook = liveOptions['commands'];
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                enable: webhook.enable,
                                customDisableReply: webhook.customDisableReply,
                                how2trade: webhook.how2trade,
                                price: webhook.price
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                buy: webhook.buy,
                                sell: webhook.sell
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                buycart: webhook.buycart,
                                sellcart: webhook.sellcart
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                cart: webhook.cart,
                                clearcart: webhook.clearcart
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                checkout: webhook.checkout
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                addToQueue: webhook.addToQueue
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                cancel: webhook.cancel
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                queue: webhook.queue
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                owner: webhook.owner,
                                discord: webhook.discord
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                more: webhook.more,
                                autokeys: webhook.autokeys
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                message: webhook.message,
                                time: webhook.time
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                uptime: webhook.uptime,
                                pure: webhook.pure
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                rate: webhook.rate,
                                stock: webhook.stock
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            commands: {
                                craftweapon: webhook.craftweapon,
                                uncraftweapon: webhook.uncraftweapon
                            }
                        },
                        null,
                        2
                    )}`
                );
            } else if (optKey === 'detailsExtra') {
                const webhook = liveOptions['detailsExtra'];

                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            detailsExtra: {
                                spells: webhook.spells
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            detailsExtra: {
                                sheens: webhook.sheens
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(
                        {
                            detailsExtra: {
                                killstreakers: webhook.killstreakers
                            }
                        },
                        null,
                        2
                    )}`
                );

                await timersPromises.setTimeout(3000);
                const paints = webhook.painted;
                const paintedKeys = Object.keys(paints);
                const paintedKeysCount = paintedKeys.length;

                const iteratePaint = Math.ceil(paintedKeysCount / 3);

                let keysIndexPaint = 0;
                for (let i = 0; i < iteratePaint; i++) {
                    const obj = {};

                    const max = keysIndexPaint + 3;
                    for (let j = keysIndexPaint; j < max; j++) {
                        const paintKey = paintedKeys[j];

                        if (paintKey !== undefined) {
                            obj[paintKey] = paints[paintKey as 'A Color Similar to Slate' | 'Legacy Paint'];
                        }
                    }

                    keysIndexPaint += 3;

                    if (Object.keys(obj).length > 0) {
                        this.bot.sendMessage(
                            steamID,
                            `/code ${JSON.stringify(
                                {
                                    detailsExtra: {
                                        painted: obj
                                    }
                                },
                                null,
                                2
                            )}`
                        );

                        await timersPromises.setTimeout(3000);
                    }
                }

                const strangeParts = webhook.strangeParts;
                const strangePartsKeys = Object.keys(strangeParts);
                const strangePartsKeysCount = strangePartsKeys.length;

                const iterateSP = Math.ceil(strangePartsKeysCount / 6);

                let keysIndex = 0;
                for (let i = 0; i < iterateSP; i++) {
                    const obj = {};

                    const max = keysIndex + 7;
                    for (let j = keysIndex; j < max; j++) {
                        const spKey = strangePartsKeys[j];

                        if (spKey !== undefined) {
                            obj[spKey] = strangeParts[spKey as 'Robots Destroyed' | 'Projectiles Reflected'];
                        }
                    }

                    keysIndex += 7;

                    if (Object.keys(obj).length > 0) {
                        this.bot.sendMessage(
                            steamID,
                            `/code ${JSON.stringify(
                                {
                                    detailsExtra: {
                                        strangeParts: obj
                                    }
                                },
                                null,
                                2
                            )}`
                        );

                        await timersPromises.setTimeout(3000);
                    }
                }
            } else {
                const show = {};
                show[optKey] = liveOptions[optKey as OptionsKeys];

                this.bot.sendMessage(steamID, `/code ${JSON.stringify(show, null, 2)}`);
            }

            isSending = false;
        }
    }

    updateOptionsCommand(steamID: SteamID, message: string): void {
        const opt = this.bot.options;
        if (
            message.includes('painted.An Extraordinary Abundance of Tinge') ||
            message.includes('painted.Ye Olde Rustic Colour') ||
            message.includes('painted.An Air of Debonair')
        ) {
            message = removeLinkProtocol(message);
        }

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
            if (Array.isArray(knownParams.discordWebhook.ownerID)) {
                knownParams.discordWebhook.ownerID.map(id => String(id));
            }
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

                if (knownParams.statistics?.sendStats?.enable === true) {
                    this.bot.sendStats();
                } else if (knownParams.statistics?.sendStats?.enable === false) {
                    this.bot.disableSendStats();
                }

                if (knownParams.statistics?.sendStats?.time !== undefined) {
                    this.bot.sendStats();
                }

                if (knownParams.highValue !== undefined) {
                    void this.bot.inventoryManager.getInventory.fetch();
                    Inventory.setOptions(this.bot.schema.paints, this.bot.strangeParts, opt.highValue);
                }

                if (typeof knownParams.normalize === 'object') {
                    void this.bot.inventoryManager.getInventory.fetch();
                }

                if (typeof knownParams.autokeys === 'object') {
                    if (knownParams.autokeys.enable !== undefined && !knownParams.autokeys.enable) {
                        void this.bot.handler.autokeys.disable(this.bot.pricelist.getKeyPrices);
                    }
                    this.bot.handler.autokeys.check();
                }

                if (knownParams.discordChat?.online !== undefined) {
                    if (this.bot.options.discordBotToken && !this.bot.isHalted) {
                        this.bot.discordBot.setPresence('online');
                    }
                }

                if (knownParams.discordChat?.halt !== undefined) {
                    if (this.bot.options.discordBotToken && this.bot.isHalted) {
                        this.bot.discordBot.setPresence('halt');
                    }
                }

                if (knownParams.details?.showAutokeys) {
                    this.bot.listings.checkByPriceKey({ priceKey: '5021;6' });
                }

                if (steamID) {
                    return this.bot.sendMessage(steamID, msg);
                } else {
                    return log.info(msg);
                }
            })
            .catch(err => {
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                const msg = `❌ Error saving options file to disk: ${errMessage}`;
                if (steamID) {
                    this.bot.sendMessage(steamID, msg);
                } else {
                    log.error(msg);
                }

                return;
            });
    }

    clearArrayCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(message)) as unknown;

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

        if (
            knownParams.pricelist === undefined &&
            knownParams.highValue === undefined &&
            knownParams.statistics === undefined &&
            knownParams.offerReceived === undefined &&
            knownParams.discordWebhook === undefined &&
            knownParams.commands === undefined
        ) {
            return this.bot.sendMessage(steamID, '❌ Parent parameter does not have any value with array type.');
        }

        const opt = this.bot.options;

        if (knownParams.pricelist?.partialPriceUpdate?.excludeSKU !== undefined) {
            opt.pricelist.partialPriceUpdate.excludeSKU.length = 0;
        }

        if (knownParams.highValue !== undefined) {
            let isChanged = false;
            if (knownParams.highValue.spells?.names !== undefined) {
                isChanged = true;
                opt.highValue.spells.names.length = 0;
            }

            if (knownParams.highValue.spells?.exceptionSkus !== undefined) {
                isChanged = true;
                opt.highValue.spells.exceptionSkus.length = 0;
            }

            if (knownParams.highValue.sheens?.names !== undefined) {
                isChanged = true;
                opt.highValue.sheens.names.length = 0;
            }

            if (knownParams.highValue.sheens?.exceptionSkus !== undefined) {
                isChanged = true;
                opt.highValue.sheens.exceptionSkus.length = 0;
            }

            if (knownParams.highValue.killstreakers?.names !== undefined) {
                isChanged = true;
                opt.highValue.killstreakers.names.length = 0;
            }

            if (knownParams.highValue.killstreakers?.exceptionSkus !== undefined) {
                isChanged = true;
                opt.highValue.killstreakers.exceptionSkus.length = 0;
            }

            if (knownParams.highValue.strangeParts?.names !== undefined) {
                isChanged = true;
                opt.highValue.strangeParts.names.length = 0;
            }

            if (knownParams.highValue.strangeParts?.exceptionSkus !== undefined) {
                isChanged = true;
                opt.highValue.strangeParts.exceptionSkus.length = 0;
            }

            if (knownParams.highValue.painted?.names !== undefined) {
                isChanged = true;
                opt.highValue.painted.names.length = 0;
            }

            if (knownParams.highValue.painted?.exceptionSkus !== undefined) {
                isChanged = true;
                opt.highValue.painted.exceptionSkus.length = 0;
            }

            if (isChanged) Inventory.setOptions(this.bot.schema.paints, this.bot.strangeParts, opt.highValue);
        }

        if (knownParams.statistics?.sendStats?.time !== undefined) {
            opt.statistics.sendStats.time.length = 0;
        }

        if (knownParams.offerReceived?.invalidValue?.exceptionValue?.skus !== undefined) {
            opt.offerReceived.invalidValue.exceptionValue.skus.length = 0;
        }

        if (knownParams.discordWebhook?.ownerID !== undefined) {
            opt.discordWebhook.ownerID.length = 0;
        }

        if (knownParams.discordWebhook?.tradeSummary?.url !== undefined) {
            opt.discordWebhook.tradeSummary.url.length = 0;
        }

        if (knownParams.discordWebhook?.tradeSummary?.mentionOwner?.itemSkus !== undefined) {
            opt.discordWebhook.tradeSummary.mentionOwner.itemSkus.length = 0;
        }

        if (knownParams.discordWebhook?.declinedTrade?.url !== undefined) {
            opt.discordWebhook.declinedTrade.url.length = 0;
        }

        if (knownParams.commands?.buy?.disableForSKU !== undefined) {
            opt.commands.buy.disableForSKU.length = 0;
        }

        if (knownParams.commands?.sell?.disableForSKU !== undefined) {
            opt.commands.sell.disableForSKU.length = 0;
        }

        if (knownParams.commands?.buycart?.disableForSKU !== undefined) {
            opt.commands.buycart.disableForSKU.length = 0;
        }

        if (knownParams.commands?.sellcart?.disableForSKU !== undefined) {
            opt.commands.sellcart.disableForSKU.length = 0;
        }

        const optionsPath = getOptionsPath(opt.steamAccountName);
        const saveOptions = deepMerge({}, opt) as JsonOptions;
        removeCliOptions(saveOptions);

        const errors = validator(saveOptions, 'options');
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
                deepMerge({}, saveOptions);
                const msg = '✅ Updated options!';

                if (steamID) {
                    return this.bot.sendMessage(steamID, msg);
                } else {
                    return log.info(msg);
                }
            })
            .catch(err => {
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                const msg = `❌ Error saving options file to disk: ${errMessage}`;
                if (steamID) {
                    this.bot.sendMessage(steamID, msg);
                } else {
                    log.error(msg);
                }

                return;
            });
    }
}
