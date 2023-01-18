import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';

export default class PaintsCommand implements ICommand {
    name = 'paints';

    description = 'Get a list of paints partial sku 🎨';

    isAdminCommand = true;

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
        this.commandHandler.misc.paintsCommand(steamID);
    };
}
