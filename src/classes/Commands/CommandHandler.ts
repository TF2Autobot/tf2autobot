import SteamID from 'steamid';
import Bot from '../Bot';
import IPricer from '../IPricer';
import log from '../../lib/logger';

import InformationCommands from './commands/information';
import CommandParser from '../CommandParser';

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
    allowInvalidType?: boolean;
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
    execute: (steamID: SteamID, message: string) => Promise<void> | void;
}

function hasAliases(command: ICommand): command is ICommand & { aliases: string[] } {
    return command.aliases !== undefined;
}

export default class CommandHandler {
    private readonly commands: Map<string, ICommand>;

    private readonly commandsPointAliases: Map<string, string>;

    constructor(private readonly bot: Bot, private readonly pricer: IPricer) {
        this.commands = new Map();
        this.commandsPointAliases = new Map();
    }

    public registerCommands(): void {
        log.info('Registering commands');
        // We will later on register all our commands here, by importing them
        // We will also include aliases and point them to the command

        // We want to initialize all our commands
        const commands = [...InformationCommands];
        for (const command of commands) {
            const cmd = new command(this.bot, this.pricer);
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

        log.debug(`Received command ${command} from ${steamID.getSteamID64()}`);

        if (command === null) {
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

        if (!cmd.allowInvalidType && isInvalidType) {
            return this.bot.sendMessage(steamID, '❌ Command not available.');
        }

        await cmd.execute(steamID, message);
    }
}
