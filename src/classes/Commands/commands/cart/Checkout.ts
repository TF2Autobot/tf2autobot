import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Cart from '../../../Carts/Cart';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';

export default class CheckoutCommand implements ICommand {
    name = 'checkout';

    description = 'Have the bot send an offer with the items in your cart ✅🛒\n\n✨=== Trade actions ===✨';

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
        if (this.commandHandler.isDonating) {
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
        this.commandHandler.addCartToQueue(cart, false, false);

        clearTimeout(this.commandHandler.adminInventoryReset);
        delete this.commandHandler.adminInventory[steamID.getSteamID64()];
    };
}
