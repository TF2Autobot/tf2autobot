import SteamID from 'steamid';
import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import Currencies from '@tf2autobot/tf2-currencies';
import dayjs from 'dayjs';
import { Message as DiscordMessage } from 'discord.js';

import * as c from './sub-classes/export';
import { removeLinkProtocol, getItemFromParams, getItemAndAmount } from './functions/utils';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import Inventory, { getSkuAmountCanTrade } from '../Inventory';
import Cart from '../Carts/Cart';
import AdminCart from '../Carts/AdminCart';
import UserCart from '../Carts/UserCart';
import DonateCart from '../Carts/DonateCart';
import PremiumCart from '../Carts/PremiumCart';
import CartQueue from '../Carts/CartQueue';
import IPricer from '../IPricer';
import { fixItem } from '../../lib/items';
import { UnknownDictionary } from '../../types/common';
import log from '../../lib/logger';
import { testPriceKey } from '../../lib/tools/export';
import { apiRequest } from '../../lib/apiRequest';
import { JournalTfBoughtItem } from '../JournalTfManager';
import { normalizeHatCommand, resolveHatSku } from '../../lib/hatSku';

type Instant = 'buy' | 'b' | 'sell' | 's';
type CraftUncraft = 'craftweapon' | 'uncraftweapon';
type Misc = 'time' | 'uptime' | 'pure' | 'rate' | 'owner' | 'discord' | 'stock';
type BlockUnblock = 'block' | 'unblock';
type NameAvatar = 'name' | 'avatar';
type TF2GC = 'expand' | 'use' | 'delete';
type ActionOnTrade = 'accept' | 'accepttrade' | 'decline' | 'declinetrade';
type ForceAction = 'faccept' | 'fdecline';

export default class Commands {
    private isDonating = false;

    private help: c.HelpCommands;

    private manager: c.ManagerCommands;

    private message: c.MessageCommand;

    private misc: c.MiscCommands;

    private opt: c.OptionsCommand;

    private pManager: c.PricelistManager;

    private request: c.RequestCommands;

    private review: c.ReviewCommands;

    private status: c.StatusCommands;

    private crafting: c.CraftingCommands;

    private adminInventory: UnknownDictionary<Inventory> = {};

    private adminInventoryReset: NodeJS.Timeout;

    constructor(private readonly bot: Bot, private readonly pricer: IPricer) {
        this.help = new c.HelpCommands(bot);
        this.manager = new c.ManagerCommands(bot);
        this.message = new c.MessageCommand(bot);
        this.misc = new c.MiscCommands(bot);
        this.opt = new c.OptionsCommand(bot);
        this.pManager = new c.PricelistManager(bot, pricer);
        this.request = new c.RequestCommands(bot, pricer);
        this.review = new c.ReviewCommands(bot);
        this.status = new c.StatusCommands(bot);
        this.crafting = new c.CraftingCommands(bot);
    }

    private get cartQueue(): CartQueue {
        return this.bot.handler.cartQueue;
    }

    private get weaponsAsCurrency(): { enable: boolean; withUncraft: boolean } {
        return {
            enable: this.bot.options.miscSettings.weaponsAsCurrency.enable,
            withUncraft: this.bot.options.miscSettings.weaponsAsCurrency.withUncraft
        };
    }

    useStatsCommand(steamID: SteamID): void {
        void this.status.statsCommand(steamID);
    }

    useUpdateOptionsCommand(steamID: SteamID | null, message: string): void {
        this.opt.updateOptionsCommand(steamID, message);
    }

    /** Button-safe entry point; execution remains in ReviewCommands. */
    async useTradeReviewAction(steamID: SteamID, offerId: string, force: boolean, accept: boolean): Promise<void> {
        if (force) {
            const forceCommand = accept ? 'faccept' : 'fdecline';
            await this.review.forceAction(
                steamID,
                `${this.bot.getPrefix(steamID)}${forceCommand} ${offerId}`,
                forceCommand,
                this.bot.getPrefix(steamID)
            );
        } else {
            const reviewCommand = accept ? 'accept' : 'decline';
            await this.review.actionOnTradeCommand(
                steamID,
                `${this.bot.getPrefix(steamID)}${reviewCommand} ${offerId}`,
                reviewCommand,
                this.bot.getPrefix(steamID)
            );
        }
    }

    async processMessage(steamID: SteamID, message: string): Promise<void> {
        const prefix = this.bot.getPrefix(steamID);
        const command = CommandParser.getCommand(message.toLowerCase(), prefix);
        const isAdmin = this.bot.isAdmin(steamID);
        const isWhitelisted = this.bot.isWhitelisted(steamID);
        const isInvalidType = steamID.type === 0;

        const checkMessage = message.split(' ').filter(word => word.includes(`!${command}`)).length;

        if (checkMessage > 1 && !isAdmin) {
            return this.bot.sendMessage(steamID, "⛔ Don't spam");
        }

        if (message.startsWith(prefix)) {
            // Allow Discord commands even when Steam commands are disabled
            const isDiscordMessage = steamID instanceof SteamID && steamID.redirectAnswerTo;

            // Check if all commands are globally disabled (skip for Discord)
            if (this.bot.options.globalDisable?.commands === true && !isAdmin && !isDiscordMessage) {
                log.debug(`Steam command "${command}" blocked for ${steamID.toString()} (commands globally disabled)`);
                return;
            }

            // Check if admin commands are globally disabled (skip for Discord)
            if (this.bot.options.globalDisable?.adminCommands === true && isAdmin && !isDiscordMessage) {
                log.debug(
                    `Steam admin command "${command}" blocked for ${steamID.toString()} (admin commands globally disabled)`
                );
                return;
            }

            try {
                message = normalizeHatCommand(message, command, this.bot.schema);
            } catch (err) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ ${err instanceof Error ? err.message : 'Invalid HAT identifier.'}`
                );
            }

            if (command === 'help') {
                void this.help.helpCommand(steamID, prefix);
            } else if (command === 'how2trade') {
                this.help.howToTradeCommand(steamID, prefix);
            } else if (['price', 'pc'].includes(command)) {
                this.priceCommand(steamID, message, prefix);
            } else if (['buy', 'b', 'sell', 's'].includes(command)) {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.buyOrSellCommand(steamID, message, command as Instant, prefix);
            } else if (command === 'buycart') {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.buyCartCommand(steamID, message, prefix);
            } else if (command === 'sellcart') {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.sellCartCommand(steamID, message, prefix);
            } else if (command === 'cart') {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.cartCommand(steamID, prefix);
            } else if (command === 'clearcart') {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.clearCartCommand(steamID);
            } else if (command === 'checkout') {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.checkoutCommand(steamID, prefix);
            } else if (command === 'cancel') {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.cancelCommand(steamID);
            } else if (command === 'queue') {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.queueCommand(steamID);
            } else if (['time', 'uptime', 'pure', 'rate', 'owner', 'discord', 'stock'].includes(command)) {
                if (command === 'stock') {
                    return this.misc.miscCommand(steamID, command as Misc, prefix, message);
                }
                this.misc.miscCommand(steamID, command as Misc, prefix);
            } else if (['link', 'links'].includes(command)) {
                this.misc.links(steamID);
            } else if (command === 'sku') {
                this.getSKU(steamID, message);
            } else if (command === 'message') {
                if (isInvalidType) {
                    return this.bot.sendMessage(steamID, '❌ Command not available.');
                }
                this.message.message(steamID, message, prefix);
            } else if (command === 'paints' && isAdmin) {
                this.misc.paintsCommand(steamID);
            } else if (command === 'more') {
                this.help.moreCommand(steamID, prefix);
            } else if (command === 'autokeys') {
                this.manager.autokeysCommand(steamID);
            } else if (['craftweapon', 'craftweapons', 'uncraftweapon', 'uncraftweapons'].includes(command)) {
                void this.misc.weaponCommand(
                    steamID,
                    command === 'craftweapons'
                        ? 'craftweapon'
                        : command === 'uncraftweapons'
                        ? 'uncraftweapon'
                        : (command as CraftUncraft)
                );
            } else if (['deposit', 'd'].includes(command) && isAdmin) {
                void this.depositCommand(steamID, message, prefix);
            } else if (['withdraw', 'w'].includes(command) && isAdmin) {
                this.withdrawCommand(steamID, message, prefix);
            } else if (command === 'withdrawmptf' && isAdmin) {
                void this.withdrawMptfCommand(steamID, message);
            } else if (command === 'mcosell' && isAdmin) {
                void this.manncoListCommand(steamID, message);
            } else if (command === 'mcobuy' && isAdmin) {
                void this.manncoBuyCommand(steamID, message);
            } else if (command === 'mcobuyorders' && isAdmin) {
                void this.manncoBuyOrdersCommand(steamID, message);
            } else if (command === 'mcobuyremove' && isAdmin) {
                void this.manncoBuyRemoveCommand(steamID, message);
            } else if (command === 'mcolistings' && isAdmin) {
                void this.manncoOnSaleCommand(steamID);
            } else if (command === 'mcosales' && isAdmin) {
                void this.manncoSalesCommand(steamID);
            } else if (command === 'mcobalance' && isAdmin) {
                void this.manncoBalanceCommand(steamID);
            } else if (command === 'mcoupdate' && isAdmin) {
                void this.manncoPriceCommand(steamID, message);
            } else if (command === 'mcowithdraw' && isAdmin) {
                void this.manncoWithdrawCommand(steamID, message);
            } else if (command === 'mcostatus' && isAdmin) {
                void this.manncoStatusCommand(steamID);
            } else if (command === 'mcoresend' && isAdmin) {
                void this.manncoResendCommand(steamID, message);
            } else if (command === 'withdrawall' && isAdmin) {
                void this.withdrawAllCommand(steamID, message);
            } else if (command === 'add' && isAdmin) {
                await this.pManager.addCommand(steamID, message);
            } else if (command === 'addbulk' && isAdmin) {
                void this.pManager.addbulkCommand(steamID, message);
            } else if (command === 'update' && isAdmin) {
                void this.pManager.updateCommand(steamID, message, prefix);
            } else if (command === 'updatebulk' && isAdmin) {
                void this.pManager.updatebulkCommand(steamID, message);
            } else if (command === 'remove' && isAdmin) {
                void this.pManager.removeCommand(steamID, message);
            } else if (command === 'removebulk' && isAdmin) {
                this.pManager.removebulkCommand(steamID, message);
            } else if (command === 'get' && isAdmin) {
                this.pManager.getCommand(steamID, message);
            } else if (command === 'getall' && isAdmin) {
                void this.pManager.getAllCommand(steamID, message);
            } else if (command === 'ppu' && isAdmin) {
                void this.pManager.partialPriceUpdateCommand(steamID, message);
            } else if (command === 'ppurecalc' && isAdmin) {
                void this.pManager.ppuRecalcCommand(steamID);
            } else if (['getslots', 'listings'].includes(command) && isAdmin) {
                void this.pManager.getSlotsCommand(steamID);
            } else if (command === 'groups' && isAdmin) {
                void this.pManager.getGroupsCommand(steamID);
            } else if (command === 'autoadd' && isAdmin) {
                this.pManager.autoAddCommand(steamID, message, prefix);
            } else if (command === 'stopautoadd' && isAdmin) {
                this.pManager.stopAutoAddCommand();
            } else if (['expand', 'delete', 'use'].includes(command) && isAdmin) {
                void this.manager.TF2GCCommand(steamID, message, command as TF2GC, prefix);
            } else if (['name', 'avatar'].includes(command) && isAdmin) {
                this.manager.nameAvatarCommand(steamID, message, command as NameAvatar, prefix);
            } else if (command === 'changename' && isAdmin) {
                this.manager.changeNameCommand(steamID, message, prefix);
            } else if (['block', 'unblock'].includes(command) && isAdmin) {
                this.manager.blockUnblockCommand(steamID, message, command as BlockUnblock, prefix);
            } else if (['blockedlist', 'blocklist', 'blist'].includes(command) && isAdmin) {
                void this.manager.blockedListCommand(steamID);
            } else if (command === 'clearfriends' && isAdmin) {
                this.manager.clearFriendsCommand(steamID);
            } else if (command === 'stop' && isAdmin) {
                this.manager.stopCommand(steamID);
            } else if (command === 'halt' && isAdmin) {
                await this.manager.haltCommand(steamID);
            } else if (command === 'unhalt' && isAdmin) {
                await this.manager.unhaltCommand(steamID);
            } else if (command === 'haltstatus' && isAdmin) {
                this.manager.haltStatusCommand(steamID);
            } else if (command === 'restart' && isAdmin) {
                this.manager.restartCommand(steamID);
            } else if (command === 'updaterepo' && isAdmin) {
                this.manager.updaterepoCommand(steamID, prefix);
            } else if (command === 'refreshautokeys' && isAdmin) {
                this.manager.refreshAutokeysCommand(steamID);
            } else if (command === 'refreshlist' && isAdmin) {
                this.manager.refreshListingsCommand(steamID);
            } else if (command === 'stats' && isAdmin) {
                void this.status.statsCommand(steamID);
            } else if (command === 'statsdw' && isAdmin) {
                this.status.statsDWCommand(steamID);
            } else if (command === 'itemstats' && (isAdmin || isWhitelisted)) {
                void this.status.itemStatsCommand(steamID, message);
            } else if (command == 'wipestats' && isAdmin) {
                void this.status.statsWipeCommand(steamID, message);
            } else if (command === 'inventory' && isAdmin) {
                this.status.inventoryCommand(steamID);
            } else if (command === 'version' && (isAdmin || isWhitelisted)) {
                this.status.versionCommand(steamID);
            } else if (command === 'trades' && isAdmin) {
                this.review.tradesCommand(steamID, prefix);
            } else if (command === 'trade' && isAdmin) {
                this.review.tradeCommand(steamID, message, prefix);
            } else if (['accepttrade', 'accept', 'declinetrade', 'decline'].includes(command) && isAdmin) {
                void this.review.actionOnTradeCommand(steamID, message, command as ActionOnTrade, prefix);
            } else if (['faccept', 'fdecline'].includes(command) && isAdmin) {
                void this.review.forceAction(steamID, message, command as ForceAction, prefix);
            } else if (command === 'offerinfo' && isAdmin) {
                this.review.offerInfo(steamID, message, prefix);
            } else if (command === 'pricecheck' && isAdmin) {
                this.request.pricecheckCommand(steamID, message);
            } else if (command === 'pricecheckall' && isAdmin) {
                void this.request.pricecheckAllCommand(steamID);
            } else if (command === 'check' && isAdmin) {
                void this.request.checkCommand(steamID, message);
            } else if (command === 'find' && isAdmin) {
                void this.pManager.findCommand(steamID, message);
            } else if (command == 'backup' && isAdmin) {
                void this.opt.backupPricelistCommand(steamID);
            } else if (command === 'options' && isAdmin) {
                void this.opt.optionsCommand(steamID, message, prefix);
            } else if (command === 'config' && isAdmin) {
                this.opt.updateOptionsCommand(steamID, message);
            } else if (command === 'cleararray' && isAdmin) {
                this.opt.clearArrayCommand(steamID, message);
            } else if (command === 'donatebptf' && isAdmin) {
                this.donateBPTFCommand(steamID, message, prefix);
            } else if (command === 'donatenow' && isAdmin) {
                this.donateNowCommand(steamID, prefix);
            } else if (command === 'donatecart' && isAdmin) {
                this.donateCartCommand(steamID, prefix);
            } else if (command === 'premium' && isAdmin) {
                this.buyBPTFPremiumCommand(steamID, message);
            } else if (command === 'refreshschema' && isAdmin) {
                this.manager.refreshSchema(steamID, prefix);
            } else if (['crafttoken', 'ct'].includes(command) && isAdmin) {
                this.crafting.craftTokenCommand(steamID, message, prefix);
            } else if (command === 'crittfgroup' && isAdmin) {
                void this.misc.pricedbGroup(steamID);
            } else if (command === 'crittfinvite' && isAdmin) {
                void this.misc.pricedbInvite(steamID, CommandParser.removeCommand(message));
            } else if (command === 'crittfinvites' && isAdmin) {
                void this.misc.pricedbInvites(steamID);
            } else if (command === 'crittfaccept' && isAdmin) {
                void this.misc.pricedbAccept(steamID, CommandParser.removeCommand(message));
            } else if (command === 'crittfleave' && isAdmin) {
                void this.misc.pricedbLeave(steamID, CommandParser.removeCommand(message));
            } else if (command === 'jtfseed' && isAdmin) {
                void this.journalTfSeedCommand(steamID);
            } else {
                const custom = this.bot.options.customMessage.commandNotFound;

                this.bot.sendMessage(
                    steamID,
                    custom ? custom.replace('%command%', command) : `❌ Command "${command}" not found!`
                );
            }
        } else if (message.includes('_')) {
            try {
                const intentDescriptor = this.bot.ecp.reverseEcpStr(message) as {
                    originalItemName: string;
                    decodedIntent: Instant | null;
                } | null;

                if (intentDescriptor === undefined) {
                    return this.bot.sendMessage(
                        steamID,
                        'Item could not be decoded. Please use the standard !buy or !sell command!'
                    );
                }

                this.buyOrSellCommand(
                    steamID,
                    intentDescriptor.originalItemName,
                    intentDescriptor.decodedIntent,
                    null,
                    true
                );
            } catch (error) {
                log.debug(
                    `Failed to decode ecp string from ${steamID.getSteamID64()}: ${
                        error instanceof Error ? error.message : String(error)
                    }`
                );

                return this.bot.sendMessage(
                    steamID,
                    'Item could not be decoded. Please use the standard !buy or !sell command!'
                );
            }
        }
    }

    private getSKU(steamID: SteamID, message: string): void {
        const itemNamesOrSkus = CommandParser.removeCommand(removeLinkProtocol(message));

        if (itemNamesOrSkus === '!sku') {
            return this.bot.sendMessage(steamID, `❌ Missing item name or item sku!`);
        }

        const itemsOrSkus = itemNamesOrSkus.split('\n');

        if (itemsOrSkus.some(item => item.trim().startsWith('Z^'))) {
            try {
                const results = itemsOrSkus.map(value => {
                    const input = value.trim();
                    const sku = input.startsWith('Z^')
                        ? resolveHatSku(input, this.bot.schema)
                        : testPriceKey(input)
                        ? input
                        : this.bot.schema.getSkuFromName(input);
                    if (sku.includes('null') || sku.includes('undefined'))
                        throw new Error(`Cannot resolve item: ${input}`);
                    return { sku, name: this.bot.schema.getName(SKU.fromString(sku), false) };
                });
                if (results.length === 1 && steamID.redirectAnswerTo instanceof DiscordMessage && this.bot.discordBot) {
                    void this.bot.discordBot.sendSkuAnswer(steamID.redirectAnswerTo, results[0].name, results[0].sku);
                } else {
                    this.bot.sendMessage(
                        steamID,
                        results
                            .map(({ name, sku }) => `• ${name}\nSKU: ${sku}\nhttps://pricedb.io/item/${sku}`)
                            .join('\n')
                    );
                }
            } catch (err) {
                this.bot.sendMessage(steamID, `❌ ${err instanceof Error ? err.message : 'Invalid HAT identifier.'}`);
            }
            return;
        }

        if (itemsOrSkus.length === 1) {
            if (!testPriceKey(itemNamesOrSkus)) {
                // Receive name
                const sku = this.bot.schema.getSkuFromName(itemNamesOrSkus);

                if (sku.includes('null') || sku.includes('undefined')) {
                    return this.bot.sendMessage(
                        steamID,
                        `Generated sku: ${sku}\nPlease check the name. If correct, please let us know. Thank you.`
                    );
                }

                if (steamID.redirectAnswerTo instanceof DiscordMessage && this.bot.discordBot) {
                    void this.bot.discordBot.sendSkuAnswer(steamID.redirectAnswerTo, itemNamesOrSkus, sku);
                } else {
                    this.bot.sendMessage(steamID, `• ${sku}\nhttps://pricedb.io/item/${sku}`);
                }
            } else {
                // Receive sku
                const name = this.bot.schema.getName(SKU.fromString(itemNamesOrSkus), false);
                if (steamID.redirectAnswerTo instanceof DiscordMessage && this.bot.discordBot) {
                    void this.bot.discordBot.sendSkuAnswer(steamID.redirectAnswerTo, name, itemNamesOrSkus);
                } else {
                    this.bot.sendMessage(steamID, `• ${name}\nhttps://pricedb.io/item/${itemNamesOrSkus}`);
                }
            }
        } else {
            const results: { source: string; generated: string }[] = [];
            itemsOrSkus.forEach(item => {
                if (!testPriceKey(item)) {
                    // Receive name
                    results.push({ source: item, generated: this.bot.schema.getSkuFromName(item) });
                } else {
                    results.push({ source: item, generated: this.bot.schema.getName(SKU.fromString(item), false) });
                }
            });

            this.bot.sendMessage(
                steamID,
                `• ${results.map(item => `${item.source} => ${item.generated}`).join('\n• ')}`
            );
        }
    }

    private priceCommand(steamID: SteamID, message: string, prefix: string): void {
        const opt = this.bot.options.commands.price;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, prefix);
        if (info === null) {
            return;
        }

        const match = info.match;
        const amount = info.amount;

        let reply = '';

        const isBuying = match.intent === 0 || match.intent === 2;
        const isSelling = match.intent === 1 || match.intent === 2;

        const keyPrice = this.bot.pricelist.getKeyPrice;

        if (isBuying) {
            reply = '💲 I am buying ';

            if (amount !== 1) {
                reply += `${amount} `;
            }

            // If the amount is 1, then don't convert to value and then to currencies. If it is for keys, then don't use conversion rate
            reply += `${pluralize(match.name, 2)} for ${(amount === 1
                ? match.buy
                : Currencies.toCurrencies(
                      match.buy.toValue(keyPrice.metal) * amount,
                      match.sku === '5021;6' ? undefined : keyPrice.metal
                  )
            ).toString()}`;
        }

        if (isSelling) {
            const currencies =
                amount === 1
                    ? match.sell
                    : Currencies.toCurrencies(
                          match.sell.toValue(keyPrice.metal) * amount,
                          match.sku === '5021;6' ? undefined : keyPrice.metal
                      );

            if (reply === '') {
                reply = '💲 I am selling ';

                if (amount !== 1) {
                    reply += `${amount} `;
                } else {
                    reply += 'a ';
                }

                reply += `${pluralize(match.name, amount)} for ${currencies.toString()}`;
            } else {
                reply += ` and selling for ${currencies.toString()}`;
            }
        }

        reply += `.\n📦 I have ${this.bot.inventoryManager.getInventory.getAmount({
            priceKey: match.id ?? match.sku,
            includeNonNormalized: false,
            tradableOnly: true
        })}`;

        if (match.max !== -1 && isBuying) {
            reply += ` / ${match.max}`;
        }

        if (isSelling && match.min !== 0) {
            reply += ` and I can sell ${this.bot.inventoryManager.amountCanTrade({
                priceKey: match.sku,
                tradeIntent: 'selling'
            })}`;
        }

        reply += '. ';

        if (match.autoprice && this.bot.isAdmin(steamID)) {
            reply += ` (price last updated ${dayjs.unix(match.time).fromNow()})`;
        }

        if (steamID.redirectAnswerTo instanceof DiscordMessage && this.bot.discordBot) {
            const stock = this.bot.inventoryManager.getInventory.getAmount({
                priceKey: match.id ?? match.sku,
                includeNonNormalized: false,
                tradableOnly: true
            });
            void this.bot.discordBot.sendPriceAnswer(steamID.redirectAnswerTo, match, stock, reply);
            return;
        }
        this.bot.sendMessage(steamID, reply);
    }

    // Instant item trade

    private buyOrSellCommand(steamID: SteamID, message: string, command: Instant, prefix: string, ecp = false): void {
        const opt = this.bot.options.commands[command === 'b' ? 'buy' : command === 's' ? 'sell' : command];

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = getItemAndAmount(
            steamID,
            ecp ? message : CommandParser.removeCommand(message),
            this.bot,
            prefix,
            command === 'b' ? 'buy' : command === 's' ? 'sell' : command
        );

        if (info === null) {
            return;
        }

        const cart = new UserCart(
            steamID,
            this.bot,
            this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
            this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
        );

        cart.setNotify = true;
        if (['b', 'buy'].includes(command)) {
            cart.addOurItem(info.priceKey, info.amount);
        } else {
            cart.addTheirItem(info.match.sku, info.amount);
        }

        this.addCartToQueue(cart, false, false);
    }

    // Multiple items trade

    private buyCartCommand(steamID: SteamID, message: string, prefix: string): void {
        const currentCart = Cart.getCart(steamID);

        if (currentCart !== null && !(currentCart instanceof UserCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const opt = this.bot.options.commands.buycart;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, prefix, 'buycart');

        if (info === null) {
            return;
        }

        let amount = info.amount;
        const cart =
            Cart.getCart(steamID) ||
            new UserCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );

        const cartAmount = cart.getOurCount(info.priceKey);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount({
            priceKey: info.priceKey,
            includeNonNormalized: false,
            tradableOnly: true
        });
        const amountCanTrade =
            this.bot.inventoryManager.amountCanTrade({ priceKey: info.priceKey, tradeIntent: 'selling' }) - cartAmount;

        const name = info.match.name;

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            return this.bot.sendMessage(
                steamID,
                'I ' +
                    (ourAmount > 0 ? "can't sell" : "don't have") +
                    ` any ${(cartAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
        }

        if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                return this.bot.sendMessage(
                    steamID,
                    `I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
            }

            this.bot.sendMessage(
                steamID,
                `I can only sell ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ` been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );
        } else
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)}` +
                    ` has been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );

        cart.addOurItem(info.priceKey, amount);
        Cart.addCart(cart);
    }

    private sellCartCommand(steamID: SteamID, message: string, prefix: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof UserCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const opt = this.bot.options.commands.sellcart;
        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, prefix, 'sellcart');
        if (info === null) {
            return;
        }

        let amount = info.amount;

        const cart =
            Cart.getCart(steamID) ||
            new UserCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );
        const skuCount = getSkuAmountCanTrade(info.match.sku, this.bot);

        const cartAmount =
            skuCount.amountCanTrade >= skuCount.amountCanTradeGeneric
                ? cart.getTheirCount(info.match.sku)
                : cart.getTheirGenericCount(info.match.sku);

        const amountCanTrade = skuCount.mostCanTrade - cartAmount;

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            return this.bot.sendMessage(
                steamID,
                'I ' +
                    (skuCount.mostCanTrade > 0 ? "can't buy" : "don't want") +
                    ` any ${(cartAmount > 0 ? 'more ' : '') + pluralize(skuCount.name, 0)}.`
            );
        }

        if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                return this.bot.sendMessage(steamID, `I unable to trade any more ${pluralize(skuCount.name, 0)}.`);
            }

            this.bot.sendMessage(
                steamID,
                `I can only buy ${pluralize(skuCount.name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ` been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(skuCount.name, Math.abs(amount), true)}` +
                    ` has been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );
        }

        cart.addTheirItem(info.match.sku, amount);
        Cart.addCart(cart);
    }

    private cartCommand(steamID: SteamID, prefix: string): void {
        const opt = this.bot.options.commands.cart;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }
        if (this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're about to send donation. Send "${prefix}donatecart" to view your donation cart summary or "${prefix}donatenow" to send donation now.`
            );
        }
        this.bot.sendMessage(steamID, Cart.stringify(steamID, false, prefix));
    }

    private clearCartCommand(steamID: SteamID): void {
        Cart.removeCart(steamID);
        const custom = this.bot.options.commands.clearcart.customReply.reply;
        this.bot.sendMessage(steamID, custom ? custom : '🛒 Your cart has been cleared.');
    }

    private checkoutCommand(steamID: SteamID, prefix: string): void {
        if (this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're about to send donation. Send "${prefix}donatecart" to view your donation cart summary or "${prefix}donatenow" to send donation now.`
            );
        }

        const cart = Cart.getCart(steamID);
        if (cart === null) {
            const custom = this.bot.options.commands.checkout.customReply.empty;
            return this.bot.sendMessage(steamID, custom ? custom : '🛒 Your cart is empty.');
        }

        cart.setNotify = true;
        cart.isDonating = false;
        this.addCartToQueue(cart, false, false);

        clearTimeout(this.adminInventoryReset);
        delete this.adminInventory[steamID.getSteamID64()];
    }

    // Trade actions

    private cancelCommand(steamID: SteamID): void {
        // Maybe have the cancel command only cancel the offer in the queue, and have a command for cancelling the offer?

        const positionInQueue = this.cartQueue.getPosition(steamID);

        // If a user is in the queue, then they can't have an active offer

        const custom = this.bot.options.commands.cancel.customReply;
        if (positionInQueue === 0) {
            // The user is in the queue and the offer is already being processed
            const cart = this.cartQueue.getCart(steamID);

            if (cart.isMade) {
                return this.bot.sendMessage(
                    steamID,
                    custom.isBeingSent
                        ? custom.isBeingSent
                        : '⚠️ Your offer is already being sent! Please try again when the offer is active.'
                );
            } else if (cart.isCanceled) {
                return this.bot.sendMessage(
                    steamID,
                    custom.isCancelling
                        ? custom.isCancelling
                        : '⚠️ Your offer is already being canceled. Please wait a few seconds for it to be canceled.'
                );
            }

            cart.setCanceled = 'BY_USER';
        } else if (positionInQueue !== -1) {
            // The user is in the queue
            this.cartQueue.dequeue(steamID);
            this.bot.sendMessage(
                steamID,
                custom.isRemovedFromQueue ? custom.isRemovedFromQueue : '✅ You have been removed from the queue.'
            );

            clearTimeout(this.adminInventoryReset);
            delete this.adminInventory[steamID.getSteamID64()];
        } else {
            // User is not in the queue, check if they have an active offer

            const activeOffer = this.bot.trades.getActiveOffer(steamID);

            if (activeOffer === null) {
                return this.bot.sendMessage(
                    steamID,
                    custom.noActiveOffer ? custom.noActiveOffer : "❌ You don't have an active offer."
                );
            }

            void this.bot.trades.getOffer(activeOffer).asCallback((err, offer) => {
                if (err || !offer) {
                    const errStringify = JSON.stringify(err);
                    const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                    return this.bot.sendMessage(
                        steamID,
                        `❌ Ohh nooooes! Something went wrong while trying to get the offer: ${errMessage}` +
                            (!offer ? ` (or the offer might already be canceled)` : '')
                    );
                }

                offer.data('canceledByUser', true);

                offer.cancel(err => {
                    // Only react to error, if the offer is canceled then the user
                    // will get an alert from the onTradeOfferChanged handler

                    if (err) {
                        log.warn('Error while trying to cancel an offer: ', err);
                        return this.bot.sendMessage(
                            steamID,
                            `❌ Ohh nooooes! Something went wrong while trying to cancel the offer: ${err.message}`
                        );
                    }

                    return this.bot.sendMessage(
                        steamID,
                        `✅ Offer sent (${offer.id}) has been successfully cancelled.`
                    );
                });
            });
        }
    }

    private addCartToQueue(cart: Cart, isDonating: boolean, isBuyingPremium: boolean): void {
        const activeOfferID = this.bot.trades.getActiveOffer(cart.partner);

        const custom = this.bot.options.commands.addToQueue;

        if (activeOfferID !== null) {
            return this.bot.sendMessage(
                cart.partner,
                custom.alreadyHaveActiveOffer
                    ? custom.alreadyHaveActiveOffer.replace(
                          /%tradeurl%/g,
                          `https://steamcommunity.com/tradeoffer/${activeOfferID}/`
                      )
                    : `❌ You already have an active offer! Please finish it before requesting a new one: https://steamcommunity.com/tradeoffer/${activeOfferID}/`
            );
        }

        const currentPosition = this.cartQueue.getPosition(cart.partner);

        if (currentPosition !== -1) {
            if (currentPosition === 0) {
                this.bot.sendMessage(
                    cart.partner,
                    custom.alreadyInQueueProcessingOffer
                        ? custom.alreadyInQueueProcessingOffer
                        : '⚠️ You are already in the queue! Please wait while I process your offer.'
                );
            } else {
                this.bot.sendMessage(
                    cart.partner,
                    custom.alreadyInQueueWaitingTurn
                        ? custom.alreadyInQueueWaitingTurn
                              .replace(/%isOrAre%/g, currentPosition !== 1 ? 'are' : 'is')
                              .replace(/%currentPosition%/g, String(currentPosition))
                        : '⚠️ You are already in the queue! Please wait your turn, there ' +
                              (currentPosition !== 1 ? 'are' : 'is') +
                              ` ${currentPosition} in front of you.`
                );
            }
            return;
        }

        const position = this.cartQueue.enqueue(cart, isDonating, isBuyingPremium);

        if (position !== 0) {
            this.bot.sendMessage(
                cart.partner,
                custom.addedToQueueWaitingTurn
                    ? custom.addedToQueueWaitingTurn
                          .replace(/%isOrAre%/g, position !== 1 ? 'are' : 'is')
                          .replace(/%position%/g, String(position))
                    : '✅ You have been added to the queue! Please wait your turn, there ' +
                          (position !== 1 ? 'are' : 'is') +
                          ` ${position} in front of you.`
            );
        }
    }

    private queueCommand(steamID: SteamID): void {
        const position = this.bot.handler.cartQueue.getPosition(steamID);
        const custom = this.bot.options.commands.queue.customReply;

        if (position === -1) {
            this.bot.sendMessage(steamID, custom.notInQueue ? custom.notInQueue : '❌ You are not in the queue.');
        } else if (position === 0) {
            this.bot.sendMessage(
                steamID,
                custom.offerBeingMade ? custom.offerBeingMade : '⌛ Your offer is being made.'
            );
        } else {
            this.bot.sendMessage(
                steamID,
                custom.hasPosition
                    ? custom.hasPosition.replace(/%position%/g, String(position))
                    : `There are ${position} users ahead of you.`
            );
        }
    }

    // Admin commands

    private sendChunkedManncoMessage(steamID: SteamID, heading: string, lines: string[]): void {
        const maxLength = 3500;
        let message = heading;
        for (const line of lines) {
            if (message.length + line.length + 1 > maxLength) {
                this.bot.sendMessage(steamID, message);
                message = `${heading} (continued)\n${line}`;
            } else {
                message += `\n${line}`;
            }
        }
        this.bot.sendMessage(steamID, message);
    }

    private isManncoStoreReady(steamID: SteamID): boolean {
        if (!this.bot.manncoStoreManager) {
            this.bot.sendMessage(steamID, '❌ Mannco.store is not configured or enabled.');
            return false;
        }
        if (!this.bot.manncoStoreManager.isReady) {
            this.bot.sendMessage(
                steamID,
                '⌛ Mannco.store is temporarily unavailable due to rate limiting and will retry automatically.'
            );
            return false;
        }
        return true;
    }

    private async manncoOnSaleCommand(steamID: SteamID): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        try {
            const items = await this.bot.manncoStoreManager.getOnSaleItems();
            if (items.length === 0) {
                return this.bot.sendMessage(steamID, 'Mannco.store has no items currently on sale.');
            }

            const lines = items.map(item => `${item.name} — $${(item.price / 100).toFixed(2)} — assetid=${item.ids}`);
            this.sendChunkedManncoMessage(steamID, `Mannco.store items on sale (${items.length}):`, lines);
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Could not get Mannco.store listings: ${(err as Error).message}`);
        }
    }

    private async manncoBalanceCommand(steamID: SteamID): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        try {
            const balance = await this.bot.manncoStoreManager.getBalance();
            this.bot.sendMessage(steamID, `💵 Mannco.store balance: $${(balance / 100).toFixed(2)}`);
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Could not get Mannco.store balance: ${(err as Error).message}`);
        }
    }

    private async manncoSalesCommand(steamID: SteamID): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        try {
            const sales = await this.bot.manncoStoreManager.getSalesHistory();
            this.bot.sendMessage(
                steamID,
                `Mannco.store sales in the last week: ${sales.count}. Recent records: ${sales.values.length}.`
            );
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Could not get Mannco.store sales history: ${(err as Error).message}`);
        }
    }

    private async manncoPriceCommand(steamID: SteamID, message: string): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        const rawParams = CommandParser.removeCommand(removeLinkProtocol(message)).trim();
        const params = CommandParser.parseParams(rawParams);
        const assetId =
            typeof params.assetid === 'string' || typeof params.assetid === 'number' ? String(params.assetid) : null;
        if (assetId === null || typeof params.price !== 'number' || params.confirm !== true) {
            return this.bot.sendMessage(
                steamID,
                '❌ Usage: !mcoupdate assetid=<asset id>&price=<cents>&confirm=true. A matching buy order may instantly sell the item.'
            );
        }

        try {
            await this.bot.manncoStoreManager.listInventory(assetId.split(/[;,]/), params.price);
            this.bot.sendMessage(
                steamID,
                `✅ Updated Mannco.store price to $${(params.price / 100).toFixed(2)}; it may have sold instantly.`
            );
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Could not update Mannco.store price: ${(err as Error).message}`);
        }
    }

    private async manncoWithdrawCommand(steamID: SteamID, message: string): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        const rawParams = CommandParser.removeCommand(removeLinkProtocol(message)).trim();
        const params = CommandParser.parseParams(rawParams);
        const assetId =
            typeof params.assetid === 'string' || typeof params.assetid === 'number'
                ? String(params.assetid)
                : /^[0-9]+(?:[;,][0-9]+)*$/.test(rawParams)
                ? rawParams
                : null;
        if (assetId === null) {
            return this.bot.sendMessage(steamID, '❌ Usage: !mcowithdraw <asset id>');
        }

        try {
            const response = await this.bot.manncoStoreManager.withdrawInventory(assetId.split(/[;,]/));
            this.bot.sendMessage(
                steamID,
                `✅ Mannco.store withdrawal requested for ${response.updated} item(s)` +
                    (response.locked > 0 ? `; ${response.locked} item(s) remain locked.` : '.') +
                    ' The matching Steam trade will be accepted automatically.'
            );
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Mannco.store withdrawal failed: ${(err as Error).message}`);
        }
    }

    private async manncoStatusCommand(steamID: SteamID): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        try {
            await this.bot.manncoStoreManager.reconcileOperations();
            const operations = this.bot.manncoStoreManager.getOperations();
            if (operations.length === 0) {
                return this.bot.sendMessage(steamID, 'Mannco.store has no tracked deposit or withdrawal operations.');
            }
            this.sendChunkedManncoMessage(
                steamID,
                'Mannco.store operation status:',
                operations.map(operation => {
                    const offer = operation.offerId ? ` — offer=${operation.offerId}` : '';
                    const error = operation.lastError ? ` — ${operation.lastError}` : '';
                    return `${operation.id} — ${operation.type} — ${operation.status}${offer}${error}`;
                })
            );
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Could not get Mannco.store operation status: ${(err as Error).message}`);
        }
    }

    private async manncoResendCommand(steamID: SteamID, message: string): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        const tradeId =
            typeof params.tradeid === 'number' ? params.tradeid : typeof params.id === 'number' ? params.id : null;
        if (tradeId === null) {
            return this.bot.sendMessage(steamID, '❌ Usage: !mcoresend tradeid=<Mannco trade id>');
        }
        try {
            await this.bot.manncoStoreManager.resendTrade(tradeId);
            this.bot.sendMessage(steamID, `✅ Requested Mannco.store resend for trade ${tradeId}.`);
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Could not resend Mannco.store trade: ${(err as Error).message}`);
        }
    }

    private async manncoBuyCommand(steamID: SteamID, message: string): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (typeof params.sku !== 'string') {
            return this.bot.sendMessage(steamID, '❌ Usage: !mcobuy sku=<pricelist sku>&quantity=<quantity>');
        }

        const quantity =
            params.quantity === undefined ? (params.amount === undefined ? 1 : params.amount) : params.quantity;
        if (typeof quantity !== 'number' || !Number.isSafeInteger(quantity) || quantity < 1 || quantity > 5000) {
            return this.bot.sendMessage(steamID, '❌ "quantity" must be a whole number from 1 to 5000.');
        }

        const entry = this.bot.pricelist.getPrice({ priceKey: params.sku, onlyEnabled: false });
        if (entry === null) {
            return this.bot.sendMessage(steamID, '❌ This SKU does not exist in the pricelist.');
        }
        if (entry.buyUsd === undefined) {
            return this.bot.sendMessage(
                steamID,
                '❌ This SKU needs a USD buy price before it can create a Mannco.store buy order.'
            );
        }

        try {
            const itemId = await this.bot.manncoStoreManager.resolveManncoItemId(entry.sku);
            await this.bot.manncoStoreManager.upsertBuyOrder(entry.sku, itemId, quantity, entry.buyUsd, entry.name);
            this.bot.sendMessage(
                steamID,
                `✅ Mannco.store buy order created for ${quantity} ${entry.name} at $${(entry.buyUsd / 100).toFixed(
                    2
                )} each.`
            );
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Mannco.store buy order failed: ${(err as Error).message}`);
        }
    }

    private async manncoBuyOrdersCommand(steamID: SteamID, message: string): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        const page = params.page === undefined ? 0 : params.page;
        if (typeof page !== 'number' || !Number.isSafeInteger(page) || page < 0) {
            return this.bot.sendMessage(steamID, '❌ "page" must be a non-negative whole number.');
        }

        try {
            const orders = await this.bot.manncoStoreManager.getBuyOrders(page);
            if (orders.length === 0) {
                return this.bot.sendMessage(steamID, `Mannco.store has no active buy orders on page ${page}.`);
            }

            this.sendChunkedManncoMessage(
                steamID,
                `Mannco.store buy orders (page ${page}):`,
                orders.map(
                    order =>
                        `${order.name} — $${(order.price / 100).toFixed(2)} × ${order.amount} — itemid=${order.itemid}`
                )
            );
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Could not get Mannco.store buy orders: ${(err as Error).message}`);
        }
    }

    private async manncoBuyRemoveCommand(steamID: SteamID, message: string): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        const itemId = typeof params.itemid === 'number' ? params.itemid : null;
        if (itemId === null) {
            return this.bot.sendMessage(steamID, '❌ Usage: !mcobuyremove itemid=<Mannco item id>');
        }

        try {
            await this.bot.manncoStoreManager.removeBuyOrder(itemId);
            this.bot.sendMessage(steamID, `✅ Removed Mannco.store buy order for itemid=${itemId}.`);
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Could not remove Mannco.store buy order: ${(err as Error).message}`);
        }
    }

    private async manncoListCommand(steamID: SteamID, message: string): Promise<void> {
        if (!this.isManncoStoreReady(steamID)) return;

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        const requestedAssetIds =
            typeof params.assetid === 'string' || typeof params.assetid === 'number'
                ? String(params.assetid)
                      .split(/[;,]/)
                      .filter(assetId => assetId.length > 0)
                : [];
        if (typeof params.sku !== 'string' && requestedAssetIds.length === 0) {
            return this.bot.sendMessage(
                steamID,
                '❌ Usage: !mcosell sku=<sku>&amount=<quantity>&confirm=true or !mcosell assetid=<asset id>&confirm=true'
            );
        }
        if (params.confirm !== true) {
            return this.bot.sendMessage(
                steamID,
                '⚠️ Mannco.store may instantly sell deposited items at an existing buy order. Repeat with &confirm=true to continue.'
            );
        }

        const amount =
            requestedAssetIds.length > 0 ? requestedAssetIds.length : params.amount === undefined ? 1 : params.amount;
        if (typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) {
            return this.bot.sendMessage(steamID, '❌ "amount" must be a positive whole number.');
        }

        const inventory = this.bot.inventoryManager.getInventory;
        const assetSkus = [...new Set(requestedAssetIds.map(assetId => inventory.findByAssetid(assetId)))];
        if (assetSkus.some(sku => sku === null) || assetSkus.length > 1) {
            return this.bot.sendMessage(steamID, '❌ Each asset ID must be a tradable bot item of the same SKU.');
        }

        const sku = typeof params.sku === 'string' ? params.sku : assetSkus[0];
        if (sku === null) {
            return this.bot.sendMessage(steamID, '❌ Could not determine the SKU for the requested asset ID.');
        }
        if (assetSkus.length === 1 && assetSkus[0] !== sku) {
            return this.bot.sendMessage(steamID, '❌ The requested asset ID does not match the supplied SKU.');
        }
        if (
            requestedAssetIds.length > 0 &&
            requestedAssetIds.some(assetId => !inventory.findBySKU(sku, true).includes(assetId))
        ) {
            return this.bot.sendMessage(steamID, '❌ Each asset ID must be a tradable bot item.');
        }

        const entry = this.bot.pricelist.getPrice({ priceKey: sku, onlyEnabled: false });
        if (entry === null || entry.sellUsd === undefined) {
            return this.bot.sendMessage(
                steamID,
                '❌ This SKU needs a pricelist USD sell price before it can be listed.'
            );
        }

        const inventoryAssetIds =
            requestedAssetIds.length > 0 ? requestedAssetIds : inventory.findBySKU(entry.sku, true);
        if (inventoryAssetIds.length < amount) {
            return this.bot.sendMessage(
                steamID,
                `❌ Only ${inventoryAssetIds.length} tradable ${entry.sku} item(s) are available.`
            );
        }

        try {
            const manncoItemId = await this.bot.manncoStoreManager.resolveManncoItemId(entry.sku);
            const depositable = await this.bot.manncoStoreManager.getDepositableAssets();
            const available = depositable.filter(
                asset => inventoryAssetIds.includes(asset.assetid) && asset.itemId === manncoItemId
            );
            if (available.length < amount) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Mannco.store only made ${available.length} of the requested assets depositable.`
                );
            }

            const selected = available.slice(0, amount);
            this.bot.sendMessage(
                steamID,
                `⌛ Creating a Mannco.store deposit for ${amount} ${entry.name} at $${(entry.sellUsd / 100).toFixed(
                    2
                )} each.`
            );

            const trade = await this.bot.manncoStoreManager.depositAndList(entry.sku, selected, entry.sellUsd);
            this.bot.sendMessage(steamID, `✅ Mannco.store deposit ${trade.id} completed and the item(s) are listed.`);
        } catch (err) {
            this.bot.sendMessage(steamID, `❌ Mannco.store listing failed: ${(err as Error).message}`);
        }
    }

    private async depositCommand(steamID: SteamID, message: string, prefix: string): Promise<void> {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

        const sku = params.sku as string;

        const amount = typeof params.amount === 'number' ? params.amount : 1;
        if (!Number.isInteger(amount)) {
            return this.bot.sendMessage(steamID, `❌ amount should only be an integer.`);
        }

        const itemName = this.bot.schema.getName(SKU.fromString(sku), false);

        const steamid = steamID.getSteamID64();

        const adminInventory =
            this.adminInventory[steamid] || new Inventory(steamID, this.bot, 'their', this.bot.boundInventoryGetter);

        if (this.adminInventory[steamid] === undefined) {
            try {
                log.debug('fetching admin inventory');
                await adminInventory.fetch();
                this.adminInventory[steamid] = adminInventory;

                clearTimeout(this.adminInventoryReset);
                this.adminInventoryReset = setTimeout(() => {
                    delete this.adminInventory[steamid];
                }, 5 * 60 * 1000);
            } catch (err) {
                log.error('Error fetching inventory: ', err);
                return this.bot.sendMessage(
                    steamID,
                    `❌ Error fetching inventory, steam might down. Please try again later. ` +
                        `If you have private profile/inventory, please set to public and try again.`
                );
            }
        }

        const dict = adminInventory.getItems;

        if (dict[params.sku as string] === undefined) {
            clearTimeout(this.adminInventoryReset);
            delete this.adminInventory[steamid];
            return this.bot.sendMessage(steamID, `❌ You don't have any ${itemName}.`);
        }

        const currentAmount = dict[params.sku as string].length;
        if (currentAmount < amount) {
            clearTimeout(this.adminInventoryReset);
            delete this.adminInventory[steamid];
            return this.bot.sendMessage(steamID, `❌ You only have ${pluralize(itemName, currentAmount, true)}.`);
        }

        const cart =
            AdminCart.getCart(steamID) ||
            new AdminCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );

        if (amount > 0) {
            const cartAmount = cart.getTheirCount(sku);

            if (cartAmount > currentAmount || cartAmount + amount > currentAmount) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ You can't add ${pluralize(itemName, amount, true)} ` +
                        `because you already have ${cartAmount} in cart and you only have ${currentAmount}.`
                );
            }
        }

        cart.addTheirItem(sku, amount);
        Cart.addCart(cart);

        this.bot.sendMessage(
            steamID,
            `✅ ${pluralize(itemName, Math.abs(amount), true)} has been ` +
                (amount >= 0 ? 'added to' : 'removed from') +
                ` your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
        );
    }

    private withdrawCommand(steamID: SteamID, message: string, prefix: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

        const sku = params.sku as string;

        let amount = typeof params.amount === 'number' ? params.amount : 1;
        if (!Number.isInteger(amount)) {
            return this.bot.sendMessage(steamID, `❌ amount should only be an integer.`);
        }

        const cart =
            AdminCart.getCart(steamID) ||
            new AdminCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );
        const cartAmount = cart.getOurCount(sku);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount({
            priceKey: sku,
            includeNonNormalized: false,
            tradableOnly: true
        });
        const amountCanTrade = ourAmount - cartAmount;
        const name = this.bot.schema.getName(SKU.fromString(sku), false);

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            this.bot.sendMessage(
                steamID,
                `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
            amount = 0;
        } else if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
            }

            this.bot.sendMessage(
                steamID,
                `I only have ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ` been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)} has been ` +
                    (amount >= 0 ? 'added to' : 'removed from') +
                    ` your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );
        }

        cart.addOurItem(sku, amount);
        Cart.addCart(cart);
    }

    private async withdrawMptfCommand(steamID: SteamID, message: string): Promise<void> {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        if (this.bot.options.mptfApiKey === '') {
            return this.bot.sendMessage(steamID, '❌ Marketplace.tf API key was not set in the env file.');
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

        const max = typeof params.max === 'number' ? params.max : 1;
        if (!Number.isInteger(max)) {
            return this.bot.sendMessage(steamID, `❌ max should only be an integer.`);
        }

        const ignorePainted =
            typeof params.ignorepainted === 'boolean'
                ? params.ignorepainted
                : typeof params.ignorepainted === 'number'
                ? !!params.ignorepainted
                : false;

        const withGroup =
            params.withgroup === '' || typeof params.withgroup !== 'string'
                ? typeof params.withgroup === 'number'
                    ? String(params.withgroup)
                    : undefined
                : params.withgroup;

        try {
            const mptfItemsSkus = await getMptfDashboardItems(this.bot.options.mptfApiKey, ignorePainted);
            const dict = this.bot.inventoryManager.getInventory.getItems;
            const clonedDict = Object.assign({}, dict);

            const weaponsAsCurrency = this.bot.options.miscSettings.weaponsAsCurrency;

            const pureAndWeapons = weaponsAsCurrency.enable
                ? ['5021;6', '5000;6', '5001;6', '5002;6'].concat(
                      weaponsAsCurrency.withUncraft
                          ? this.bot.craftWeapons.concat(this.bot.uncraftWeapons)
                          : this.bot.craftWeapons
                  )
                : ['5021;6', '5000;6', '5001;6', '5002;6'];

            for (const sku in clonedDict) {
                if (!Object.prototype.hasOwnProperty.call(clonedDict, sku)) {
                    continue;
                }

                let isWithinGroup = false;

                if (withGroup) {
                    if (withGroup !== this.bot.pricelist.getPrice({ priceKey: sku })?.group) {
                        delete clonedDict[sku];
                        continue;
                    }
                    isWithinGroup = true;
                }

                if (pureAndWeapons.includes(sku) && !isWithinGroup) {
                    delete clonedDict[sku];
                    continue;
                }

                // eslint-disable-next-line @typescript-eslint/prefer-regexp-exec
                if (ignorePainted && sku.match(/;[p][0-9]+/) !== null) {
                    delete clonedDict[sku];
                    continue;
                }

                if (mptfItemsSkus[sku] && mptfItemsSkus[sku] >= max) {
                    // If this particular item already exist on mptf and it's more than or equal to max, ignore
                    delete clonedDict[sku];
                }
            }

            if (Object.keys(clonedDict).length === 0) {
                return this.bot.sendMessage(steamID, `❌ Nothing to withdraw.`);
            }

            const cart =
                AdminCart.getCart(steamID) ||
                new AdminCart(
                    steamID,
                    this.bot,
                    this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                    this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
                );

            for (const sku in clonedDict) {
                if (!Object.prototype.hasOwnProperty.call(clonedDict, sku)) {
                    continue;
                }

                const amountInInventory = clonedDict[sku].length;
                const amountInMptf = mptfItemsSkus[sku] ?? 0;
                cart.addOurItem(sku, amountInInventory + amountInMptf >= max ? max - amountInMptf : amountInInventory);
            }

            Cart.addCart(cart);
            this.addCartToQueue(cart, false, false);
        } catch (err) {
            log.error('Error on !withdrawMptf:', err);
            return this.bot.sendMessage(steamID, `❌ Error: ${(err as Error)?.message}`);
        }
    }

    private withdrawAllCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));

        const max = typeof params.max === 'number' ? params.max : Infinity;
        if (params.max && !Number.isInteger(max)) {
            return this.bot.sendMessage(steamID, `❌ max should only be an integer.`);
        }

        const withGroup =
            params.withgroup === '' || typeof params.withgroup !== 'string'
                ? typeof params.withgroup === 'number'
                    ? String(params.withgroup)
                    : undefined
                : params.withgroup;

        const dict = this.bot.inventoryManager.getInventory.getItems;
        const clonedDict = Object.assign({}, dict);

        if (withGroup) {
            for (const sku in clonedDict) {
                if (!Object.prototype.hasOwnProperty.call(clonedDict, sku)) {
                    continue;
                }

                if (withGroup !== this.bot.pricelist.getPrice({ priceKey: sku })?.group) {
                    delete clonedDict[sku];
                    continue;
                }
            }
        }

        if (Object.keys(clonedDict).length === 0) {
            return this.bot.sendMessage(steamID, `❌ Nothing to withdraw.`);
        }

        const cart =
            AdminCart.getCart(steamID) ||
            new AdminCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );

        for (const sku in clonedDict) {
            if (!Object.prototype.hasOwnProperty.call(clonedDict, sku)) {
                continue;
            }

            const amountInInventory = clonedDict[sku].length;
            cart.addOurItem(sku, amountInInventory >= max ? max - amountInInventory : amountInInventory);
        }

        Cart.addCart(cart);
        this.addCartToQueue(cart, false, false);
    }

    private donateBPTFCommand(steamID: SteamID, message: string, prefix: string): void {
        const currentCart = Cart.getCart(steamID);

        if (currentCart !== null && !(currentCart instanceof DonateCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one.'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

        const sku = params.sku as string;

        if (!['725;6;uncraftable', '5021;6', '126;6', '143;6', '162;6'].includes(sku)) {
            return this.bot.sendMessage(
                steamID,
                `❌ Invalid item ${this.bot.schema.getName(
                    SKU.fromString(sku),
                    false
                )}. Items that can only be donated to Backpack.tf:\n• ` +
                    [
                        'Non-Craftable Tour of Duty Ticket (725;6;uncraftable)',
                        'Mann Co. Supply Crate Key (5021;6)',
                        "Bill's Hat (126;6)",
                        'Earbuds (143;6)',
                        "Max's Severed Head (162;6)"
                    ].join('\n• ') +
                    '\n\nhttps://backpack.tf/donate'
            );
        }

        let amount = typeof params.amount === 'number' ? params.amount : 1;

        const cart =
            DonateCart.getCart(steamID) ||
            new DonateCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );

        const cartAmount = cart.getOurCount(sku);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount({
            priceKey: sku,
            includeNonNormalized: false,
            tradableOnly: true
        });
        const amountCanTrade = ourAmount - cart.getOurCount(sku) - cartAmount;

        const name = this.bot.schema.getName(SKU.fromString(sku), false);

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            this.bot.sendMessage(
                steamID,
                `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
            amount = 0;
        } else if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
            }

            this.bot.sendMessage(
                steamID,
                `I only have ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ` been added to your donate cart. Type "${prefix}donatecart" to view your donation cart summary or "${prefix}donatenow" to donate. 💰`
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)} has been ` +
                    (amount >= 0 ? 'added to' : 'removed from') +
                    ` your donate cart. Type "${prefix}donatecart" to view your donation cart summary or "${prefix}donatenow" to donate. 💰`
            );
        }

        this.isDonating = true;

        cart.addOurItem(sku, amount);
        Cart.addCart(cart);
    }

    private donateNowCommand(steamID: SteamID, prefix: string): void {
        if (!this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're currently not donating to backpack.tf. If a cart already been created, cancel it with "${prefix}clearcart"`
            );
        }

        const cart = Cart.getCart(steamID);
        if (cart === null) {
            return this.bot.sendMessage(steamID, '💰 Your donation cart is empty.');
        }

        this.isDonating = false;

        cart.setNotify = true;
        cart.isDonating = true;

        this.addCartToQueue(cart, true, false);
    }

    private donateCartCommand(steamID: SteamID, prefix: string): void {
        if (!this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're currently not donating to backpack.tf. If a cart already been created, cancel it with "${prefix}clearcart"`
            );
        }
        this.bot.sendMessage(steamID, Cart.stringify(steamID, true, prefix));
    }

    private buyBPTFPremiumCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof PremiumCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one.'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (
            params.months === undefined ||
            typeof params.months !== 'number' ||
            !Number.isInteger(params.months) ||
            params.months < 1
        ) {
            return this.bot.sendMessage(
                steamID,
                '❌ Wrong syntax. Example: !premium months=1' +
                    '\n\n📌 Note: 📌\n- ' +
                    [
                        '1 month = 4 keys',
                        '2 months = 8 keys',
                        '3 months = 10 keys',
                        '4 months = 14 keys',
                        '1 year (12 months) = 40 keys'
                    ].join('\n- ')
            );
        }

        const amountMonths = params.months;
        const numMonths = params.months;
        const threeMonthBlocks = Math.floor(numMonths / 3);
        const remainingMonths = numMonths % 3;
        const amountKeys = threeMonthBlocks * 10 + remainingMonths * 4;

        const ourAmount = this.bot.inventoryManager.getInventory.getAmount({
            priceKey: '5021;6',
            includeNonNormalized: false,
            tradableOnly: true
        });

        if (ourAmount < amountKeys) {
            return this.bot.sendMessage(
                steamID,
                `❌ I don't have enough keys to buy premium for ${pluralize(
                    'month',
                    amountMonths,
                    true
                )}. I have ${pluralize('key', ourAmount, true)} and need ${pluralize(
                    'key',
                    amountKeys - ourAmount,
                    true
                )} more.`
            );
        }

        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        if (!['yes', true].includes(params.confirm)) {
            return this.bot.sendMessage(
                steamID,
                `⚠️ Are you sure that you want to buy premium for ${pluralize('month', amountMonths, true)}?` +
                    `\nThis will cost you ${pluralize('key', amountKeys, true)}.` +
                    `\nIf yes, retry by sending !premium months=${amountMonths}&confirm=true or confirm=yes`
            );
        }

        const cart = new PremiumCart(
            steamID,
            this.bot,
            this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
            this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
        );

        cart.addOurItem('5021;6', amountKeys);
        Cart.addCart(cart);

        cart.setNotify = true;
        cart.isBuyingPremium = true;

        this.addCartToQueue(cart, false, true);
    }

    private async journalTfSeedCommand(steamID: SteamID): Promise<void> {
        if (!this.bot.journalTfManager) {
            return this.bot.sendMessage(steamID, 'journal.tf sync is not enabled or JOURNAL_TF_API_KEY is not set.');
        }

        const inventory = this.bot.inventoryManager.getInventory.getItems;
        const purchasedAt = new Date().toISOString().slice(0, 10);
        const seedItems: JournalTfBoughtItem[] = [];
        let unpriced = 0;

        for (const sku in inventory) {
            if (!Object.prototype.hasOwnProperty.call(inventory, sku) || !this.shouldSeedJournalTfSku(sku)) {
                continue;
            }

            const price = await this.getCurrentJournalTfBuyPrice(sku);
            if (!price) {
                unpriced++;
                log.warn(`Skipping journal.tf seed for ${sku}: no current buy price found`);
                continue;
            }

            seedItems.push({
                sku,
                itemName: this.bot.schema.getName(SKU.fromString(sku), false),
                buyPriceKeys: price.keys,
                buyPriceMetal: price.metal,
                quantity: inventory[sku].length,
                purchasedAt,
                notes: 'Seeded by bot from current inventory via !jtfseed'
            });
        }

        if (seedItems.length === 0) {
            return this.bot.sendMessage(
                steamID,
                unpriced > 0
                    ? `journal.tf seed found no priced items to add. Unpriced SKUs skipped: ${unpriced}.`
                    : 'journal.tf seed found no items to add.'
            );
        }

        try {
            const result = await this.bot.journalTfManager.seedInventory(`seed-${Date.now()}`, seedItems);
            this.bot.sendMessage(
                steamID,
                `journal.tf seed complete. Created ${result.created} item ledger ${
                    result.created === 1 ? 'entry' : 'entries'
                }, skipped ${result.skipped} already covered item${result.skipped === 1 ? '' : 's'}${
                    unpriced > 0 ? `, skipped ${unpriced} unpriced SKU${unpriced === 1 ? '' : 's'}` : ''
                }.`
            );
        } catch (err) {
            log.warn('journal.tf seed failed:', err);
            this.bot.sendMessage(steamID, `journal.tf seed failed: ${(err as Error).message}`);
        }
    }

    private shouldSeedJournalTfSku(sku: string): boolean {
        if (['5002;6', '5001;6', '5000;6'].includes(sku)) {
            return false;
        }

        if (sku === '5021;6') {
            return this.bot.options.autokeys.enable;
        }

        return true;
    }

    private async getCurrentJournalTfBuyPrice(sku: string): Promise<{ keys: number; metal: number } | null> {
        const keyPrice = this.bot.pricelist.getKeyPrice.metal;
        const currentPrice = this.bot.pricelist.getPrice({ priceKey: sku, onlyEnabled: false, getGenericPrice: true });

        if (currentPrice?.buy) {
            return this.normalizeJournalTfPrice(currentPrice.buy.keys, currentPrice.buy.metal, keyPrice);
        }

        const price = await this.bot.pricelist.getItemPrices(sku);
        if (price?.buy) {
            return this.normalizeJournalTfPrice(price.buy.keys, price.buy.metal, keyPrice);
        }

        return null;
    }

    private normalizeJournalTfPrice(
        keys: number,
        metal: number,
        keyPriceInRef: number
    ): { keys: number; metal: number } {
        if (keyPriceInRef <= 0) {
            return {
                keys: Math.max(0, keys),
                metal: Math.max(0, Number(metal.toFixed(2)))
            };
        }

        const totalMetal = Math.max(0, keys * keyPriceInRef + metal);
        const normalizedKeys = Math.floor(totalMetal / keyPriceInRef);
        const normalizedMetal = Number((totalMetal - normalizedKeys * keyPriceInRef).toFixed(2));

        return {
            keys: normalizedKeys,
            metal: normalizedMetal
        };
    }
}

const paintCanDefindexes = [
    5023, // Paint Can
    5027, // Indubitably Green
    5028, // Zepheniah's Greed
    5029, // Noble Hatter's Violet
    5030, // Color No. 216-190-216
    5031, // A Deep Commitment to Purple
    5032, // Mann Co. Orange
    5033, // Muskelmannbraun
    5034, // Peculiarly Drab Tincture
    5035, // Radigan Conagher Brown
    5036, // Ye Olde Rustic Colour
    5037, // Australium Gold
    5038, // Aged Moustache Grey
    5039, // An Extraordinary Abundance of Tinge
    5040, // A Distinctive Lack of Hue
    5046, // Team Spirit
    5051, // Pink as Hell
    5052, // A Color Similar to Slate
    5053, // Drably Olive
    5054, // The Bitter Taste of Defeat and Lime
    5055, // The Color of a Gentlemann's Business Pants
    5056, // Dark Salmon Injustice
    5060, // Operator's Overalls
    5061, // Waterlogged Lab Coat
    5062, // Balaclavas Are Forever
    5063, // An Air of Debonair
    5064, // The Value of Teamwork
    5065, // Cream Spirit
    5076, // A Mann's Mint
    5077 // After Eight
];

function getMptfDashboardItems(mptfApiKey: string, ignorePainted = false): Promise<GetMptfDashboardItemsReturn> {
    return new Promise((resolve, reject) => {
        apiRequest<GetMptfDashboardItems>({
            method: 'GET',
            url: 'https://marketplace.tf/api/Seller/GetDashboardItems/v2',
            headers: {
                'User-Agent': 'TF2AutobotPriceDB@' + process.env.BOT_VERSION
            },
            params: {
                key: mptfApiKey
            }
        })
            .then(body => {
                if (body.success === false) {
                    return reject(body);
                }

                const items = body.items
                    .map(item => {
                        let sku = item.sku
                            .replace(/;ks-\d+/, '') // Sheen
                            .replace(/;ke-\d+/, ''); // Killstreaker

                        if (ignorePainted || paintCanDefindexes.includes(item.defindex)) {
                            sku = sku.replace(/;[p][0-9]+/, ''); // Painted
                        }

                        return {
                            sku,
                            amount: item.num_for_sale
                        };
                    })
                    .filter(item => testPriceKey(item.sku));

                const itemsSize = items.length;
                const toReturn = {};

                for (let i = 0; i < itemsSize; i++) {
                    toReturn[items[i].sku] = items[i].amount;
                }

                return resolve(toReturn);
            })
            .catch(err => reject(err));
    });
}

interface GetMptfDashboardItemsReturn {
    [sku: string]: number;
}

interface GetMptfDashboardItems {
    success: boolean;
    error?: string;
    num_item_groups?: number;
    total_items?: number;
    items?: Item[];
}

interface Item {
    sku: string;
    full_sku: string;
    name: string;
    defindex: number | null;
    quality: number | null;
    num_for_sale: number;
    price: number; // cent
}
