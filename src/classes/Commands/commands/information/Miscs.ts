import SteamID from 'steamid';
import CommandHandler, { ICommand, Misc } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';

export default class MiscCommands implements ICommand {
    name = 'stock';

    aliases = ['time', 'uptime', 'pure', 'rate', 'owner', 'discord', 'stock'];

    description = '';

    constructor(
        public readonly bot: Bot,
        public readonly pricer: IPricer,
        public readonly commandHandler: CommandHandler
    ) {
        this.bot = bot;
        this.pricer = pricer;
        this.commandHandler = commandHandler;
    }

    // I don't like this approach, and better to remove this aliases and turn them into specific commands
    // In their own classes
    execute = (steamID: SteamID, message: string, command) => {
        if (command === 'stock') {
            this.commandHandler.misc.miscCommand(steamID, command as Misc, message);
        }
        this.commandHandler.misc.miscCommand(steamID, command as Misc);
    };
}
