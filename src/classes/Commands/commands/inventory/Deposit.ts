import SteamID from 'steamid';
import SKU from '@tf2autobot/tf2-sku';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';
import Cart from '../../../Carts/Cart';
import AdminCart from '../../../Carts/AdminCart';
import CommandParser from '../../../CommandParser';
import { getItemFromParams, removeLinkProtocol } from '../../functions/utils';
import { fixItem } from '../../../../lib/items';
import Inventory from '../../../Inventory';
import log from '../../../../lib/logger';
import pluralize from 'pluralize';

export default class DepositCommand implements ICommand {
    name = 'deposit';

    aliases = ['d'];

    description = '';

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
    execute = async (steamID: SteamID, message: string) => {
        const prefix = this.bot.getPrefix(steamID);
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

        const sku = params.sku as string;

        const amount = typeof params.amount === 'number' ? params.amount : 1;
        if (!Number.isInteger(amount)) {
            return this.bot.sendMessage(steamID, `❌ amount should only be an integer.`);
        }

        const itemName = this.bot.schema.getName(SKU.fromString(sku), false);

        const steamid = steamID.getSteamID64();

        const adminInventory =
            this.commandHandler.adminInventory[steamid] ||
            new Inventory(steamID, this.bot, 'their', this.bot.boundInventoryGetter);

        if (this.commandHandler.adminInventory[steamid] === undefined) {
            try {
                log.debug('fetching admin inventory');
                await adminInventory.fetch();
                this.commandHandler.adminInventory[steamid] = adminInventory;

                clearTimeout(this.commandHandler.adminInventoryReset);
                this.commandHandler.adminInventoryReset = setTimeout(() => {
                    delete this.commandHandler.adminInventory[steamid];
                }, 5 * 60 * 1000);
            } catch (err) {
                log.error('Error fetching inventory: ', err);
                return this.bot.sendMessage(
                    steamID,
                    `❌ Error fetching inventory, steam might down. Please try again later. ` +
                        `If you have private profile/inventory, please set to public and try again.`
                );
            }
        }

        const dict = adminInventory.getItems;

        if (dict[params.sku as string] === undefined) {
            clearTimeout(this.commandHandler.adminInventoryReset);
            delete this.commandHandler.adminInventory[steamid];
            return this.bot.sendMessage(steamID, `❌ You don't have any ${itemName}.`);
        }

        const currentAmount = dict[params.sku as string].length;
        if (currentAmount < amount) {
            clearTimeout(this.commandHandler.adminInventoryReset);
            delete this.commandHandler.adminInventory[steamid];
            return this.bot.sendMessage(steamID, `❌ You only have ${pluralize(itemName, currentAmount, true)}.`);
        }

        const cart =
            AdminCart.getCart(steamID) ||
            new AdminCart(
                steamID,
                this.bot,
                this.commandHandler.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.commandHandler.weaponsAsCurrency.enable && this.commandHandler.weaponsAsCurrency.withUncraft
                    ? this.bot.uncraftWeapons
                    : []
            );

        if (amount > 0) {
            const cartAmount = cart.getTheirCount(sku);

            if (cartAmount > currentAmount || cartAmount + amount > currentAmount) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ You can't add ${pluralize(itemName, amount, true)} ` +
                        `because you already have ${cartAmount} in cart and you only have ${currentAmount}.`
                );
            }
        }

        cart.addTheirItem(sku, amount);
        Cart.addCart(cart);

        this.bot.sendMessage(
            steamID,
            `✅ ${pluralize(itemName, Math.abs(amount), true)} has been ` +
                (amount >= 0 ? 'added to' : 'removed from') +
                ` your cart. Type "${prefix}cart" to view your cart summary or "${prefix}checkout" to checkout. 🛒`
        );
    };
}
