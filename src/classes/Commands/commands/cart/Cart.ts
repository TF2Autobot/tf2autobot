import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Cart from '../../../Carts/Cart';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';

export default class CartCommand implements ICommand {
    name = 'cart';

    description = 'View your cart 🛒';

    dontAllowInvalidType = true;

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
        const opt = this.bot.options.commands.cart;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        if (this.commandHandler.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're about to send donation. Send "${prefix}donatecart" to view your donation cart summary or "${prefix}donatenow" to send donation now.`
            );
        }

        this.bot.sendMessage(steamID, Cart.stringify(steamID, false, prefix));
    };
}
