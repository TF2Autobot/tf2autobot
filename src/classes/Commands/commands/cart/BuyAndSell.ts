import SteamID from 'steamid';
import CommandHandler, { ICommand, Instant } from '../../CommandHandler';
import { getItemAndAmount } from '../../functions/utils';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';
import CommandParser from '../../../CommandParser';
import UserCart from '../../../Carts/UserCart';

export default class BuyAndSellCommand implements ICommand {
    name = 'buy';

    aliases = ['b', 'sell', 's'];

    usage = '[amount] <name>';

    description = 'Instantly buy an item 💲';

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

    execute(steamID: SteamID, message: string, command: Instant) {
        const opt = this.bot.options.commands[command === 'b' ? 'buy' : command === 's' ? 'sell' : command];
        const prefix = this.bot.getPrefix(steamID);

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = getItemAndAmount(
            steamID,
            CommandParser.removeCommand(message),
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
            this.commandHandler.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
            this.commandHandler.weaponsAsCurrency.enable && this.commandHandler.weaponsAsCurrency.withUncraft
                ? this.bot.uncraftWeapons
                : []
        );

        cart.setNotify = true;
        if (['b', 'buy'].includes(command)) {
            cart.addOurItem(info.priceKey, info.amount);
        } else {
            cart.addTheirItem(info.match.sku, info.amount);
        }

        this.commandHandler.addCartToQueue(cart, false, false);
    }
}
