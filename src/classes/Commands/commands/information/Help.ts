import SteamID from 'steamid';
import { ICommand } from '../../CommandHandler';
import Bot from 'src/classes/Bot';
import IPricer from 'src/classes/IPricer';

export default class HelpCommand implements ICommand {
    name = 'help';

    description = 'Shows all available commands';

    constructor(public readonly bot: Bot, public readonly pricer: IPricer) {
        this.bot = bot;
        this.pricer = pricer;
    }

    execute = (steamID: SteamID, message: string) => {
        const isAdmin = this.bot.isAdmin(steamID);
        const isCustomPricer = this.bot.pricelist.isUseCustomPricer;
    };
}
