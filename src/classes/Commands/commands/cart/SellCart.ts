import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import pluralize from 'pluralize';
import { getItemAndAmount } from '../../functions/utils';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';
import Cart from '../../../Carts/Cart';
import UserCart from '../../../Carts/UserCart';
import CommandParser from '../../../CommandParser';
import { getSkuAmountCanTrade } from '../../../Inventory';

export default class SellCartCommand implements ICommand {
    name = 'sellcart';

    description = 'Add an item you want to sell to your cart 🛒';

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
        const prefix = this.bot.getPrefix(steamID);

        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof UserCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const opt = this.bot.options.commands.sellcart;
        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, prefix, 'sellcart');
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
        const skuCount = getSkuAmountCanTrade(info.match.sku, this.bot);

        const cartAmount =
            skuCount.amountCanTrade >= skuCount.amountCanTradeGeneric
                ? cart.getTheirCount(info.match.sku)
                : cart.getTheirGenericCount(info.match.sku);

        const amountCanTrade = skuCount.mostCanTrade - cartAmount;

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            return this.bot.sendMessage(
                steamID,
                'I ' +
                    (skuCount.mostCanTrade > 0 ? "can't buy" : "don't want") +
                    ` any ${(cartAmount > 0 ? 'more ' : '') + pluralize(skuCount.name, 0)}.`
            );
        }

        if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                return this.bot.sendMessage(steamID, `I unable to trade any more ${pluralize(skuCount.name, 0)}.`);
            }

            this.bot.sendMessage(
                steamID,
                `I can only buy ${pluralize(skuCount.name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ` been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(skuCount.name, Math.abs(amount), true)}` +
                    ` has been added to your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
            );
        }

        cart.addTheirItem(info.match.sku, amount);
        Cart.addCart(cart);
    };
}
