import SteamID from 'steamid';
import Bot from '../Bot';
import IPricer from '../IPricer';
import log from '../../lib/logger';
import CommandParser from '../CommandParser';
import CartQueue from '../Carts/CartQueue';
import Cart from '../Carts/Cart';
import { UnknownDictionary } from '../../types/common';
import Inventory from '../Inventory';
import * as c from './sub-classes/export';

// Import all commands
import InformationCommands from './commands/information';
import CartCommands from './commands/cart';
import InventoryCommands from './commands/inventory';

export interface ICommand {
    /**
     * Name of the command
     */
    name: string;
    /**
     * The description of the command
     */
    description: string;
    /**
     * Instance of the bot class
     */
    bot: Bot;
    /**
     * Instance of the pricer class
     */
    pricer: IPricer;
    /**
     * The command can have aliases which will point to the command
     */
    aliases?: string[];
    /**
     * How to use the command
     */
    usage?: string;
    /**
     * Allow the steamID to be invalid
     */
    dontAllowInvalidType?: boolean;
    /**
     * Is only allowed for admins
     */
    isAdminCommand?: boolean;
    /**
     * Is only allowed for whitelisted users
     */
    isWhitelistCommand?: boolean;
    /**
     * When the command is called
     */
    execute: (steamID: SteamID, message: string, command?: any) => Promise<void> | void;
}

export type Instant = 'buy' | 'b' | 'sell' | 's';
export type CraftUncraft = 'craftweapon' | 'uncraftweapon';
export type Misc = 'time' | 'uptime' | 'pure' | 'rate' | 'owner' | 'discord' | 'stock';
export type BlockUnblock = 'block' | 'unblock';
export type NameAvatar = 'name' | 'avatar';
export type TF2GC = 'expand' | 'use' | 'delete';
export type ActionOnTrade = 'accept' | 'accepttrade' | 'decline' | 'declinetrade';
export type ForceAction = 'faccept' | 'fdecline';

function hasAliases(command: ICommand): command is ICommand & { aliases: string[] } {
    return command.aliases !== undefined;
}

export default class CommandHandler {
    manager: c.ManagerCommands;

    private message: c.MessageCommand;

    help: c.HelpCommands;

    misc: c.MiscCommands;

    private opt: c.OptionsCommand;

    private pManager: c.PricelistManager;

    private request: c.RequestCommands;

    private review: c.ReviewCommands;

    private status: c.StatusCommands;

    private crafting: c.CraftingCommands;

    isDonating = false;

    adminInventoryReset: NodeJS.Timeout;

    adminInventory: UnknownDictionary<Inventory> = {};

    private readonly commands: Map<string, ICommand>;

    private readonly commandsPointAliases: Map<string, string>;

    constructor(private readonly bot: Bot, private readonly pricer: IPricer) {
        this.commands = new Map();
        this.commandsPointAliases = new Map();
        this.help = new c.HelpCommands(this.bot);
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

    public registerCommands(): void {
        log.info('Registering commands');
        // We will later on register all our commands here, by importing them
        // We will also include aliases and point them to the command

        // We want to initialize all our commands
        const commands = [...InformationCommands, ...CartCommands, ...InventoryCommands];
        for (const command of commands) {
            const cmd = new command(this.bot, this.pricer, this);
            this.commands.set(cmd.name, cmd);
            if (hasAliases(cmd)) {
                for (const alias of cmd.aliases) {
                    this.commandsPointAliases.set(alias, cmd.name);
                }
            }
        }
    }

    public async handleCommand(steamID: SteamID, message: string): Promise<void> {
        const prefix = this.bot.getPrefix(steamID);
        const command = CommandParser.getCommand(message.toLowerCase(), prefix);
        const isAdmin = this.bot.isAdmin(steamID);
        const isWhitelisted = this.bot.isWhitelisted(steamID);
        const isInvalidType = steamID.type === 0;

        const checkMessage = message.split(' ').filter(word => word.includes(`!${command}`)).length;

        if (checkMessage > 1 && !isAdmin) {
            return this.bot.sendMessage(steamID, "⛔ Don't spam");
        }

        log.debug(`Received command ${command} from ${steamID.getSteamID64()}`);

        if (command === null) {
            const custom = this.bot.options.customMessage.commandNotFound;

            this.bot.sendMessage(
                steamID,
                custom ? custom.replace('%command%', command) : `❌ Command "${command}" not found!`
            );
            return;
        }

        const cmd = this.commands.get(command) ?? this.commands.get(this.commandsPointAliases.get(command) ?? '');

        if (cmd === undefined) {
            return;
        }

        // Check if the command is an admin command
        if (cmd.isAdminCommand && !isAdmin) {
            // But we should also check if the command is a whitelist command
            if (cmd.isWhitelistCommand && !isWhitelisted) {
                return;
            }
            return;
        }

        // By default dontAllowInvalidType is false
        if (cmd.dontAllowInvalidType && isInvalidType) {
            return this.bot.sendMessage(steamID, '❌ Command not available.');
        }

        await cmd.execute(steamID, message, command);
    }

    get cartQueue(): CartQueue {
        return this.bot.handler.cartQueue;
    }

    get weaponsAsCurrency(): { enable: boolean; withUncraft: boolean } {
        return {
            enable: this.bot.options.miscSettings.weaponsAsCurrency.enable,
            withUncraft: this.bot.options.miscSettings.weaponsAsCurrency.withUncraft
        };
    }

    addCartToQueue(cart: Cart, isDonating: boolean, isBuyingPremium: boolean): void {
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

    useStatsCommand(steamID: SteamID): void {
        void this.status.statsCommand(steamID);
    }

    useUpdateOptionsCommand(steamID: SteamID | null, message: string): void {
        this.opt.updateOptionsCommand(steamID, message);
    }
}
