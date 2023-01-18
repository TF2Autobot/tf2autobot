import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import pluralize from 'pluralize';
import { getItemAndAmount } from '../../functions/utils';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';
import Cart from '../../../Carts/Cart';
import UserCart from '../../../Carts/UserCart';
import CommandParser from '../../../CommandParser';

export default class BuyCartCommand implements ICommand {
    name = 'buycart';

    description = 'Add an item you want to buy to your cart 🛒';

    usage = '[amount] <name>';

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
        const currentCart = Cart.getCart(steamID);
        const prefix = this.bot.getPrefix(steamID);

        if (currentCart !== null && !(currentCart instanceof UserCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const opt = this.bot.options.commands.buycart;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, prefix, 'buycart');

        if (info === null) {
            return;
        }

        let amount = info.amount;
        const cart =
            Cart.getCart(steamID) ||
            new UserCart(
                steamID,
                this.bot,
                this.commandHandler.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.commandHandler.weaponsAsCurrency.enable && this.commandHandler.weaponsAsCurrency.withUncraft
                    ? this.bot.uncraftWeapons
                    : []
            );

        const cartAmount = cart.getOurCount(info.priceKey);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount({
            priceKey: info.priceKey,
            includeNonNormalized: false,
            tradableOnly: true
        });
        const amountCanTrade =
            this.bot.inventoryManager.amountCanTrade({ priceKey: info.priceKey, tradeIntent: 'selling' }) - cartAmount;

        const name = info.match.name;

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            return this.bot.sendMessage(
                steamID,
                'I ' +
                    (ourAmount > 0 ? "can't sell" : "don't have") +
                    ` any ${(cartAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
        }

        if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                return this.bot.sendMessage(
                    steamID,
                    `I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
            }

            this.bot.sendMessage(
                steamID,
                `I can only sell ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ` been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );
        } else
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)}` +
                    ` has been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );

        cart.addOurItem(info.priceKey, amount);
        Cart.addCart(cart);
    };
}
