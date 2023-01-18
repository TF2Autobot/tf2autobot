import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';

export default class MoreCommand implements ICommand {
    name = 'more';

    description = 'Show the advanced commands list';

    constructor(
        public readonly bot: Bot,
        public readonly pricer: IPricer,
        public readonly commandHandler: CommandHandler
    ) {
        this.bot = bot;
        this.pricer = pricer;
        this.commandHandler = commandHandler;
    }

    execute = (steamID: SteamID, message: string) => {
        const prefix = this.bot.getPrefix(steamID);
        void this.commandHandler.help.moreCommand(steamID, prefix);
    };
}
