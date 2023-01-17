import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';
import Cart from '../../../Carts/Cart';

export default class ClearCartCommand implements ICommand {
    name = 'clearcart';

    description = 'View your cart 🛒';

    allowInvalidType = false;

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
        Cart.removeCart(steamID);
        const custom = this.bot.options.commands.clearcart.customReply.reply;
        this.bot.sendMessage(steamID, custom ? custom : '🛒 Your cart has been cleared.');
    };
}
