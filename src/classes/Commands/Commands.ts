import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies-2';
import dayjs from 'dayjs';

import * as c from './sub-classes/export';
import { fixSKU, getItemAndAmount, getItemFromParams, removeLinkProtocol } from './functions/utils';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import Inventory, { getSkuAmountCanTrade } from '../Inventory';
import Cart from '../Carts/Cart';
import AdminCart from '../Carts/AdminCart';
import UserCart from '../Carts/UserCart';
import DonateCart from '../Carts/DonateCart';
import PremiumCart from '../Carts/PremiumCart';
import CartQueue from '../Carts/CartQueue';
import IPricer from '../IPricer';
import { fixItem } from '../../lib/items';
import { UnknownDictionary } from '../../types/common';
import log from '../../lib/logger';

type Instant = 'buy' | 'b' | 'sell' | 's';
type CraftUncraft = 'craftweapon' | 'uncraftweapon';
type Misc = 'time' | 'uptime' | 'pure' | 'rate' | 'owner' | 'discord' | 'stock';
type BlockUnblock = 'block' | 'unblock';
type NameAvatar = 'name' | 'avatar';
type TF2GC = 'expand' | 'use' | 'delete';
type ActionOnTrade = 'accept' | 'accepttrade' | 'decline' | 'declinetrade';
type ForceAction = 'faccept' | 'fdecline';

export default class Commands {
    private isDonating = false;

    private help: c.HelpCommands;

    private manager: c.ManagerCommands;

    private message: c.MessageCommand;

    private misc: c.MiscCommands;

    private opt: c.OptionsCommand;

    private pManager: c.PricelistManager;

    private request: c.RequestCommands;

    private review: c.ReviewCommands;

    private status: c.StatusCommands;

    private crafting: c.CraftingCommands;

    adminInventory: UnknownDictionary<Inventory> = {};

    constructor(private readonly bot: Bot, private readonly pricer: IPricer) {
        this.help = new c.HelpCommands(bot);
        this.manager = new c.ManagerCommands(bot);
        this.message = new c.MessageCommand(bot);
        this.misc = new c.MiscCommands(bot);
        this.opt = new c.OptionsCommand(bot);
        this.pManager = new c.PricelistManager(bot, pricer);
        this.request = new c.RequestCommands(bot, pricer);
        this.review = new c.ReviewCommands(bot);
        this.status = new c.StatusCommands(bot);
        this.crafting = new c.CraftingCommands(bot);
    }

    private get cartQueue(): CartQueue {
        return this.bot.handler.cartQueue;
    }

    private get weaponsAsCurrency(): { enable: boolean; withUncraft: boolean } {
        return {
            enable: this.bot.options.miscSettings.weaponsAsCurrency.enable,
            withUncraft: this.bot.options.miscSettings.weaponsAsCurrency.withUncraft
        };
    }

    async useStatsCommand(steamID: SteamID): Promise<void> {
        return this.status.statsCommand(steamID);
    }

    async useUpdateOptionsCommand(steamID: SteamID | null, message: string): Promise<void> {
        return this.opt.updateOptionsCommand(steamID, message);
    }

    async processMessage(steamID: SteamID, message: string): Promise<void> {
        const command = CommandParser.getCommand(message.toLowerCase());
        const isAdmin = this.bot.isAdmin(steamID);
        const isWhitelisted = this.bot.isWhitelisted(steamID);

        const checkMessage = message.split(' ').filter(word => word.includes(`!${command}`)).length;

        if (checkMessage > 1) {
            return this.bot.sendMessage(steamID, "⛔ Don't spam");
        }

        const ignoreWords: { [type: string]: string[] } = {
            startsWith: [
                'I',
                '❌',
                'Hi',
                '🙋🏻‍♀️Hi',
                '⚠',
                '⚠️',
                '✅',
                '⌛',
                '💲',
                '📜',
                '🛒',
                '💰',
                'Here',
                'The',
                'Please',
                'You',
                '/quote',
                '/pre',
                '/me',
                '/code',
                'Oh',
                'Success!',
                'Hey',
                'Unfortunately',
                '==',
                '💬',
                '⇌',
                'Command',
                'Hello',
                '✋ Hold on',
                'Hold on',
                'Sending',
                '👋 Welcome',
                'Welcome',
                'To',
                '🔰',
                'My',
                'Owner',
                'Bot',
                'Those',
                '👨🏼‍💻',
                '🔶',
                'Buying',
                '🔷',
                'Selling',
                '📥',
                'Stock',
                'Thank',
                'Unknown'
            ],
            endsWith: ['cart.', 'checkout.', '✅']
        };

        if (command === 'help') {
            await this.help.helpCommand(steamID);
        } else if (command === 'how2trade') {
            await this.help.howToTradeCommand(steamID);
        } else if (['price', 'pc'].includes(command)) {
            await this.priceCommand(steamID, message);
        } else if (['buy', 'b', 'sell', 's'].includes(command)) {
            await this.buyOrSellCommand(steamID, message, command as Instant);
        } else if (command === 'buycart') {
            await this.buyCartCommand(steamID, message);
        } else if (command === 'sellcart') {
            await this.sellCartCommand(steamID, message);
        } else if (command === 'cart') {
            await this.cartCommand(steamID);
        } else if (command === 'clearcart') {
            await this.clearCartCommand(steamID);
        } else if (command === 'checkout') {
            await this.checkoutCommand(steamID);
        } else if (command === 'cancel') {
            await this.cancelCommand(steamID);
        } else if (command === 'queue') {
            await this.queueCommand(steamID);
        } else if (['time', 'uptime', 'pure', 'rate', 'owner', 'discord', 'stock'].includes(command)) {
            await this.misc.miscCommand(steamID, command as Misc);
        } else if (command === 'paints' && isAdmin) {
            await this.misc.paintsCommand(steamID);
        } else if (command === 'more') {
            await this.help.moreCommand(steamID);
        } else if (command === 'autokeys') {
            await this.manager.autokeysCommand(steamID);
        } else if (command === 'message') {
            await this.message.message(steamID, message);
        } else if (['craftweapon', 'craftweapons', 'uncraftweapon', 'uncraftweapons'].includes(command)) {
            await this.misc.weaponCommand(
                steamID,
                command === 'craftweapons'
                    ? 'craftweapon'
                    : command === 'uncraftweapons'
                    ? 'uncraftweapon'
                    : (command as CraftUncraft)
            );
        } else if (['deposit', 'd'].includes(command) && isAdmin) {
            await this.depositCommand(steamID, message);
        } else if (['withdraw', 'w'].includes(command) && isAdmin) {
            await this.withdrawCommand(steamID, message);
        } else if (command === 'add' && isAdmin) {
            await this.pManager.addCommand(steamID, message);
        } else if (command === 'addbulk' && isAdmin) {
            await this.pManager.addbulkCommand(steamID, message);
        } else if (command === 'update' && isAdmin) {
            await this.pManager.updateCommand(steamID, message);
        } else if (command === 'updatebulk' && isAdmin) {
            await this.pManager.updatebulkCommand(steamID, message);
        } else if (command === 'remove' && isAdmin) {
            await this.pManager.removeCommand(steamID, message);
        } else if (command === 'removebulk' && isAdmin) {
            await this.pManager.removebulkCommand(steamID, message);
        } else if (command === 'get' && isAdmin) {
            await this.pManager.getCommand(steamID, message);
        } else if (command === 'getall' && isAdmin) {
            await this.pManager.getAllCommand(steamID, message);
        } else if (command === 'ppu' && isAdmin) {
            await this.pManager.partialPriceUpdateCommand(steamID, message);
        } else if (['getslots', 'listings'].includes(command) && isAdmin) {
            await this.pManager.getSlotsCommand(steamID);
        } else if (command === 'autoadd' && isAdmin) {
            await this.pManager.autoAddCommand(steamID, message);
        } else if (command === 'stopautoadd' && isAdmin) {
            this.pManager.stopAutoAddCommand();
        } else if (['expand', 'delete', 'use'].includes(command) && isAdmin) {
            await this.manager.TF2GCCommand(steamID, message, command as TF2GC);
        } else if (['name', 'avatar'].includes(command) && isAdmin) {
            await this.manager.nameAvatarCommand(steamID, message, command as NameAvatar);
        } else if (['block', 'unblock'].includes(command) && isAdmin) {
            await this.manager.blockUnblockCommand(steamID, message, command as BlockUnblock);
        } else if (['blockedlist', 'blocklist', 'blist'].includes(command) && isAdmin) {
            await this.manager.blockedListCommand(steamID);
        } else if (command === 'clearfriends' && isAdmin) {
            await this.manager.clearFriendsCommand(steamID);
        } else if (command === 'stop' && isAdmin) {
            await this.manager.stopCommand(steamID);
        } else if (command === 'restart' && isAdmin) {
            await this.manager.restartCommand(steamID);
        } else if (command === 'refreshautokeys' && isAdmin) {
            await this.manager.refreshAutokeysCommand(steamID);
        } else if (command === 'refreshlist' && isAdmin) {
            await this.manager.refreshListingsCommand(steamID);
        } else if (command === 'stats' && isAdmin) {
            await this.status.statsCommand(steamID);
        } else if (command === 'statsdw' && isAdmin) {
            await this.status.statsDWCommand(steamID);
        } else if (command === 'itemstats' && (isAdmin || isWhitelisted)) {
            await this.status.itemStatsCommand(steamID, message);
        } else if (command === 'inventory' && isAdmin) {
            await this.status.inventoryCommand(steamID);
        } else if (command === 'version' && isAdmin) {
            await this.status.versionCommand(steamID);
        } else if (command === 'trades' && isAdmin) {
            await this.review.tradesCommand(steamID);
        } else if (command === 'trade' && isAdmin) {
            await this.review.tradeCommand(steamID, message);
        } else if (['accepttrade', 'accept', 'declinetrade', 'decline'].includes(command) && isAdmin) {
            await this.review.actionOnTradeCommand(steamID, message, command as ActionOnTrade);
        } else if (['faccept', 'fdecline'].includes(command) && isAdmin) {
            await this.review.forceAction(steamID, message, command as ForceAction);
        } else if (command === 'offerinfo' && isAdmin) {
            await this.review.offerInfo(steamID, message);
        } else if (command === 'pricecheck' && isAdmin) {
            await this.request.pricecheckCommand(steamID, message);
        } else if (command === 'pricecheckall' && isAdmin) {
            await this.request.pricecheckAllCommand(steamID);
        } else if (command === 'check' && isAdmin) {
            await this.request.checkCommand(steamID, message);
        } else if (command === 'find' && isAdmin) {
            await this.pManager.findCommand(steamID, message);
        } else if (command === 'options' && isAdmin) {
            await this.opt.optionsCommand(steamID, message);
        } else if (command === 'config' && isAdmin) {
            await this.opt.updateOptionsCommand(steamID, message);
        } else if (command === 'cleararray' && isAdmin) {
            await this.opt.clearArrayCommand(steamID, message);
        } else if (command === 'donatebptf' && isAdmin) {
            await this.donateBPTFCommand(steamID, message);
        } else if (command === 'donatenow' && isAdmin) {
            await this.donateNowCommand(steamID);
        } else if (command === 'donatecart' && isAdmin) {
            await this.donateCartCommand(steamID);
        } else if (command === 'premium' && isAdmin) {
            await this.buyBPTFPremiumCommand(steamID, message);
        } else if (command === 'sku' && isAdmin) {
            await this.getSKU(steamID, message);
        } else if (command === 'refreshschema' && isAdmin) {
            await this.manager.refreshSchema(steamID);
        } else if (command === 'crafttoken' && isAdmin) {
            await this.crafting.craftTokenCommand(steamID, message);
        } else if (
            ignoreWords.startsWith.some(word => message.startsWith(word)) ||
            ignoreWords.endsWith.some(word => message.endsWith(word))
        ) {
            return;
        } else {
            const custom = this.bot.options.customMessage.iDontKnowWhatYouMean;
            await this.bot.sendMessage(
                steamID,
                custom ? custom : '❌ I don\'t know what you mean, please type "!help" for all of my commands!'
            );
        }
    }

    private async getSKU(steamID: SteamID, message: string): Promise<void> {
        const itemName = CommandParser.removeCommand(removeLinkProtocol(message));
        const sku = this.bot.schema.getSkuFromName(itemName);

        await this.bot.sendMessage(steamID, sku);

        if (sku.includes('null') || sku.includes('undefined')) {
            return this.bot.sendMessage(steamID, 'Please check the name. If correct, please let us know. Thank you.');
        }
    }

    private async priceCommand(steamID: SteamID, message: string): Promise<void> {
        const opt = this.bot.options.commands.price;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return await this.bot.sendMessage(
                    steamID,
                    custom ? custom : '❌ This command is disabled by the owner.'
                );
            }
        }

        const response = getItemAndAmount(
            CommandParser.removeCommand(message),
            this.bot.pricelist,
            this.bot.effects,
            this.bot.options
        );
        if (response.errorMessage) {
            return this.bot.sendMessage(steamID, response.errorMessage);
        }
        if (response.info === null) {
            return;
        }
        const info = response.info;
        if (info.message) {
            await this.bot.sendMessage(steamID, response.info.message);
        }

        const match = info.match;
        const amount = info.amount;

        let reply = '';

        const isBuying = match.intent === 0 || match.intent === 2;
        const isSelling = match.intent === 1 || match.intent === 2;

        const keyPrice = this.bot.pricelist.getKeyPrice;

        if (isBuying) {
            reply = '💲 I am buying ';

            if (amount !== 1) {
                reply += `${amount} `;
            }

            // If the amount is 1, then don't convert to value and then to currencies. If it is for keys, then don't use conversion rate
            reply += `${pluralize(match.name, 2)} for ${(amount === 1
                ? match.buy
                : Currencies.toCurrencies(
                      match.buy.toValue(keyPrice.metal) * amount,
                      match.sku === '5021;6' ? undefined : keyPrice.metal
                  )
            ).toString()}`;
        }

        if (isSelling) {
            const currencies =
                amount === 1
                    ? match.sell
                    : Currencies.toCurrencies(
                          match.sell.toValue(keyPrice.metal) * amount,
                          match.sku === '5021;6' ? undefined : keyPrice.metal
                      );

            if (reply === '') {
                reply = '💲 I am selling ';

                if (amount !== 1) {
                    reply += `${amount} `;
                } else {
                    reply += 'a ';
                }

                reply += `${pluralize(match.name, amount)} for ${currencies.toString()}`;
            } else {
                reply += ` and selling for ${currencies.toString()}`;
            }
        }

        reply += `.\n📦 I have ${this.bot.inventoryManager.getInventory.getAmount(match.sku, false, true)}`;

        if (match.max !== -1 && isBuying) {
            reply += ` / ${match.max}`;
        }

        if (isSelling && match.min !== 0) {
            reply += ` and I can sell ${this.bot.inventoryManager.amountCanTrade(match.sku, false)}`;
        }

        reply += '. ';

        if (match.autoprice && this.bot.isAdmin(steamID)) {
            reply += ` (price last updated ${dayjs.unix(match.time).fromNow()})`;
        }

        await this.bot.sendMessage(steamID, reply);
    }

    // Instant item trade

    private async buyOrSellCommand(steamID: SteamID, message: string, command: Instant): Promise<void> {
        const opt = this.bot.options.commands[command === 'b' ? 'buy' : command === 's' ? 'sell' : command];

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return await this.bot.sendMessage(
                    steamID,
                    custom ? custom : '❌ This command is disabled by the owner.'
                );
            }
        }

        const response = getItemAndAmount(
            CommandParser.removeCommand(message),
            this.bot.pricelist,
            this.bot.effects,
            this.bot.options,
            command === 'b' ? 'buy' : command === 's' ? 'sell' : command
        );
        if (response.errorMessage) {
            return this.bot.sendMessage(steamID, response.errorMessage);
        }
        if (response.info === null) {
            return;
        }
        const info = response.info;
        if (info.message) {
            await this.bot.sendMessage(steamID, response.info.message);
        }

        const cart = new UserCart(
            steamID,
            this.bot,
            this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
            this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
        );

        cart.setNotify = true;
        cart[['b', 'buy'].includes(command) ? 'addOurItem' : 'addTheirItem'](info.match.sku, info.amount);

        return this.addCartToQueue(cart, false, false);
    }

    // Multiple items trade

    private async buyCartCommand(steamID: SteamID, message: string): Promise<void> {
        const currentCart = Cart.getCart(steamID);

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
                return await this.bot.sendMessage(
                    steamID,
                    custom ? custom : '❌ This command is disabled by the owner.'
                );
            }
        }

        const response = getItemAndAmount(
            CommandParser.removeCommand(message),
            this.bot.pricelist,
            this.bot.effects,
            this.bot.options,
            'buycart'
        );
        if (response.errorMessage) {
            return await this.bot.sendMessage(steamID, response.errorMessage);
        }
        if (response.info === null) {
            return;
        }
        const info = response.info;
        if (info.message) {
            await this.bot.sendMessage(steamID, response.info.message);
        }

        let amount = info.amount;
        const cart =
            Cart.getCart(steamID) ||
            new UserCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );

        const cartAmount = cart.getOurCount(info.match.sku);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(info.match.sku, false, true);
        const amountCanTrade = this.bot.inventoryManager.amountCanTrade(info.match.sku, false) - cartAmount;

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

            await this.bot.sendMessage(
                steamID,
                `I can only sell ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        } else
            await this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)}` +
                    ' has been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );

        cart.addOurItem(info.match.sku, amount);
        Cart.addCart(cart);
    }

    private async sellCartCommand(steamID: SteamID, message: string): Promise<void> {
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

        const response = getItemAndAmount(
            CommandParser.removeCommand(message),
            this.bot.pricelist,
            this.bot.effects,
            this.bot.options,
            'sellcart'
        );
        if (response.errorMessage) {
            return this.bot.sendMessage(steamID, response.errorMessage);
        }
        if (response.info === null) {
            return;
        }
        const info = response.info;
        if (info.message) {
            await this.bot.sendMessage(steamID, response.info.message);
        }

        let amount = info.amount;

        const cart =
            Cart.getCart(steamID) ||
            new UserCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
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

            await this.bot.sendMessage(
                steamID,
                `I can only buy ${pluralize(skuCount.name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        } else {
            await this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(skuCount.name, Math.abs(amount), true)}` +
                    ' has been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        }

        cart.addTheirItem(info.match.sku, amount);
        Cart.addCart(cart);
    }

    private async cartCommand(steamID: SteamID): Promise<void> {
        const opt = this.bot.options.commands.cart;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }
        if (this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're about to send donation. Send "!donatecart" to view your donation cart summary or "!donatenow" to send donation now.`
            );
        }
        return this.bot.sendMessage(steamID, Cart.stringify(steamID, false));
    }

    private async clearCartCommand(steamID: SteamID): Promise<void> {
        Cart.removeCart(steamID);
        const custom = this.bot.options.commands.clearcart.customReply.reply;
        return this.bot.sendMessage(steamID, custom ? custom : '🛒 Your cart has been cleared.');
    }

    private async checkoutCommand(steamID: SteamID): Promise<void> {
        if (this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're about to send donation. Send "!donatecart" to view your donation cart summary or "!donatenow" to send donation now.`
            );
        }

        const cart = Cart.getCart(steamID);
        if (cart === null) {
            const custom = this.bot.options.commands.checkout.customReply.empty;
            return this.bot.sendMessage(steamID, custom ? custom : '🛒 Your cart is empty.');
        }

        cart.setNotify = true;
        cart.isDonating = false;
        await this.addCartToQueue(cart, false, false);

        this.adminInventory = {};
    }

    // Trade actions

    private async cancelCommand(steamID: SteamID): Promise<void> {
        // Maybe have the cancel command only cancel the offer in the queue, and have a command for canceling the offer?

        const positionInQueue = this.cartQueue.getPosition(steamID);

        // If a user is in the queue, then they can't have an active offer

        const custom = this.bot.options.commands.cancel.customReply;
        if (positionInQueue === 0) {
            // The user is in the queue and the offer is already being processed
            const cart = this.cartQueue.getCart(steamID);

            if (cart.isMade) {
                return this.bot.sendMessage(
                    steamID,
                    custom.isBeingSent
                        ? custom.isBeingSent
                        : '⚠️ Your offer is already being sent! Please try again when the offer is active.'
                );
            } else if (cart.isCanceled) {
                return this.bot.sendMessage(
                    steamID,
                    custom.isCancelling
                        ? custom.isCancelling
                        : '⚠️ Your offer is already being canceled. Please wait a few seconds for it to be canceled.'
                );
            }

            cart.setCanceled = 'BY_USER';
        } else if (positionInQueue !== -1) {
            // The user is in the queue
            this.cartQueue.dequeue(steamID);
            await this.bot.sendMessage(
                steamID,
                custom.isRemovedFromQueue ? custom.isRemovedFromQueue : '✅ You have been removed from the queue.'
            );

            this.adminInventory = {};
        } else {
            // User is not in the queue, check if they have an active offer

            const activeOffer = this.bot.trades.getActiveOffer(steamID);

            if (activeOffer === null) {
                return this.bot.sendMessage(
                    steamID,
                    custom.noActiveOffer ? custom.noActiveOffer : "❌ You don't have an active offer."
                );
            }

            return await this.bot.trades.getOffer(activeOffer).then(
                offer => {
                    if (!offer) {
                        return this.bot.sendMessage(steamID, `❌ The offer might already be canceled`);
                    }

                    offer.data('canceledByUser', true);

                    return new Promise(resolve =>
                        offer.cancel(err => {
                            // Only react to error, if the offer is canceled then the user
                            // will get an alert from the onTradeOfferChanged handler

                            if (err) {
                                log.warn('Error while trying to cancel an offer: ', err);
                                resolve(
                                    this.bot.sendMessage(
                                        steamID,
                                        `❌ Ohh nooooes! Something went wrong while trying to cancel the offer: ${err.message}`
                                    )
                                );
                            }
                        })
                    );
                },
                err => {
                    const errStringify = JSON.stringify(err);
                    const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                    return this.bot.sendMessage(
                        steamID,
                        `❌ Ohh nooooes! Something went wrong while trying to get the offer: ${errMessage}`
                    );
                }
            );
        }
    }

    private async addCartToQueue(cart: Cart, isDonating: boolean, isBuyingPremium: boolean): Promise<void> {
        const activeOfferID = this.bot.trades.getActiveOffer(cart.partner);

        const custom = this.bot.options.commands.addToQueue;

        if (activeOfferID !== null) {
            return this.bot.sendMessage(
                cart.partner,
                custom.alreadyHaveActiveOffer
                    ? custom.alreadyHaveActiveOffer.replace(
                          /%tradeurl%/g,
                          `https://steamcommunity.com/tradeoffer/${activeOfferID}/`
                      )
                    : `❌ You already have an active offer! Please finish it before requesting a new one: https://steamcommunity.com/tradeoffer/${activeOfferID}/`
            );
        }

        const currentPosition = this.cartQueue.getPosition(cart.partner);

        if (currentPosition !== -1) {
            if (currentPosition === 0) {
                return this.bot.sendMessage(
                    cart.partner,
                    custom.alreadyInQueueProcessingOffer
                        ? custom.alreadyInQueueProcessingOffer
                        : '⚠️ You are already in the queue! Please wait while I process your offer.'
                );
            } else {
                return this.bot.sendMessage(
                    cart.partner,
                    custom.alreadyInQueueWaitingTurn
                        ? custom.alreadyInQueueWaitingTurn
                              .replace(/%isOrAre%/g, currentPosition !== 1 ? 'are' : 'is')
                              .replace(/%currentPosition%/g, String(currentPosition))
                        : '⚠️ You are already in the queue! Please wait your turn, there ' +
                              (currentPosition !== 1 ? 'are' : 'is') +
                              ` ${currentPosition} in front of you.`
                );
            }
        }

        const position = await this.cartQueue.enqueue(cart, isDonating, isBuyingPremium);

        if (position !== 0) {
            return this.bot.sendMessage(
                cart.partner,
                custom.addedToQueueWaitingTurn
                    ? custom.addedToQueueWaitingTurn
                          .replace(/%isOrAre%/g, position !== 1 ? 'are' : 'is')
                          .replace(/%position%/g, String(position))
                    : '✅ You have been added to the queue! Please wait your turn, there ' +
                          (position !== 1 ? 'are' : 'is') +
                          ` ${position} in front of you.`
            );
        }
    }

    private queueCommand(steamID: SteamID): Promise<void> {
        const position = this.bot.handler.cartQueue.getPosition(steamID);
        const custom = this.bot.options.commands.queue.customReply;

        if (position === -1) {
            return this.bot.sendMessage(
                steamID,
                custom.notInQueue ? custom.notInQueue : '❌ You are not in the queue.'
            );
        } else if (position === 0) {
            return this.bot.sendMessage(
                steamID,
                custom.offerBeingMade ? custom.offerBeingMade : '⌛ Your offer is being made.'
            );
        } else {
            return this.bot.sendMessage(
                steamID,
                custom.hasPosition
                    ? custom.hasPosition.replace(/%position%/g, String(position))
                    : `There are ${position} users ahead of you.`
            );
        }
    }

    // Admin commands

    private async depositCommand(steamID: SteamID, message: string): Promise<void> {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const response = getItemFromParams(params, this.bot.schema);
            if (response.errorMessage) {
                return this.bot.sendMessage(steamID, response.errorMessage);
            }
            if (response.item === null) {
                return;
            }
            params.sku = SKU.fromObject(response.item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

        params.sku = fixSKU(params.sku);

        const amount = typeof params.amount === 'number' ? params.amount : 1;
        if (!Number.isInteger(amount)) {
            return this.bot.sendMessage(steamID, `❌ amount should only be an integer.`);
        }

        const itemName = this.bot.schema.getName(SKU.fromString(params.sku), false);

        const steamid = steamID.getSteamID64();

        const adminInventory =
            this.adminInventory[steamid] ||
            new Inventory(
                steamID,
                this.bot.manager,
                this.bot.schema,
                this.bot.options,
                this.bot.effects,
                this.bot.paints,
                this.bot.strangeParts,
                'their'
            );

        if (this.adminInventory[steamid] === undefined) {
            try {
                log.debug('fetching admin inventory');
                await adminInventory.fetch();
                this.adminInventory[steamid] = adminInventory;
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
            return this.bot.sendMessage(steamID, `❌ You don't have any ${itemName}.`);
        }

        const currentAmount = dict[params.sku as string].length;
        if (currentAmount < amount) {
            return this.bot.sendMessage(steamID, `❌ You only have ${pluralize(itemName, currentAmount, true)}.`);
        }

        const cart =
            AdminCart.getCart(steamID) ||
            new AdminCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );

        if (amount > 0) {
            const cartAmount = cart.getTheirCount(params.sku);

            if (cartAmount > currentAmount || cartAmount + amount > currentAmount) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ You can't add ${pluralize(itemName, amount, true)} ` +
                        `because you already have ${cartAmount} in cart and you only have ${currentAmount}.`
                );
            }
        }

        cart.addTheirItem(params.sku, amount);
        Cart.addCart(cart);

        return this.bot.sendMessage(
            steamID,
            `✅ ${pluralize(itemName, Math.abs(amount), true)} has been ` +
                (amount >= 0 ? 'added to' : 'removed from') +
                ' your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
        );
    }

    private async withdrawCommand(steamID: SteamID, message: string): Promise<void> {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const response = getItemFromParams(params, this.bot.schema);
            if (response.errorMessage) {
                return this.bot.sendMessage(steamID, response.errorMessage);
            }
            if (response.item === null) {
                return;
            }

            params.sku = SKU.fromObject(response.item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

        params.sku = fixSKU(params.sku);

        let amount = typeof params.amount === 'number' ? params.amount : 1;
        if (!Number.isInteger(amount)) {
            return this.bot.sendMessage(steamID, `❌ amount should only be an integer.`);
        }

        const cart =
            AdminCart.getCart(steamID) ||
            new AdminCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );
        const cartAmount = cart.getOurCount(params.sku);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(params.sku, false, true);
        const amountCanTrade = ourAmount - cartAmount;
        const name = this.bot.schema.getName(SKU.fromString(params.sku), false);

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            await this.bot.sendMessage(
                steamID,
                `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
            amount = 0;
        } else if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
            }

            await this.bot.sendMessage(
                steamID,
                `I only have ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        } else {
            await this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)} has been ` +
                    (amount >= 0 ? 'added to' : 'removed from') +
                    ' your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        }

        cart.addOurItem(params.sku, amount);
        Cart.addCart(cart);
    }

    private async donateBPTFCommand(steamID: SteamID, message: string): Promise<void> {
        const currentCart = Cart.getCart(steamID);

        if (currentCart !== null && !(currentCart instanceof DonateCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one.'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const response = getItemFromParams(params, this.bot.schema);
            if (response.errorMessage) {
                return this.bot.sendMessage(steamID, response.errorMessage);
            }
            if (response.item === null) {
                return;
            }

            params.sku = SKU.fromObject(response.item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

        if (!['725;6;uncraftable', '5021;6', '126;6', '143;6', '162;6'].includes(params.sku)) {
            return this.bot.sendMessage(
                steamID,
                `❌ Invalid item ${this.bot.schema.getName(
                    SKU.fromString(params.sku),
                    false
                )}. Items that can only be donated to Backpack.tf:\n• ` +
                    [
                        'Non-Craftable Tour of Duty Ticket (725;6;uncraftable)',
                        'Mann Co. Supply Crate Key (5021;6)',
                        "Bill's Hat (126;6)",
                        'Earbuds (143;6)',
                        "Max's Severed Head (162;6)"
                    ].join('\n• ') +
                    '\n\nhttps://backpack.tf/donate'
            );
        }

        let amount = typeof params.amount === 'number' ? params.amount : 1;

        const cart =
            DonateCart.getCart(steamID) ||
            new DonateCart(
                steamID,
                this.bot,
                this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
                this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
            );

        const cartAmount = cart.getOurCount(params.sku);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(params.sku, false, true);
        const amountCanTrade = ourAmount - cart.getOurCount(params.sku) - cartAmount;

        const name = this.bot.schema.getName(SKU.fromString(params.sku), false);

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            await this.bot.sendMessage(
                steamID,
                `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
            amount = 0;
        } else if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
            }

            await this.bot.sendMessage(
                steamID,
                `I only have ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your donate cart. Type "!donatecart" to view your donation cart summary or "!donatenow" to donate. 💰'
            );
        } else {
            await this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)} has been ` +
                    (amount >= 0 ? 'added to' : 'removed from') +
                    ' your donate cart. Type "!donatecart" to view your donation cart summary or "!donatenow" to donate. 💰'
            );
        }

        this.isDonating = true;

        cart.addOurItem(params.sku, amount);
        Cart.addCart(cart);
    }

    private async donateNowCommand(steamID: SteamID): Promise<void> {
        if (!this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're currently not donating to backpack.tf. If a cart already been created, cancel it with "!clearcart"`
            );
        }

        const cart = Cart.getCart(steamID);
        if (cart === null) {
            return this.bot.sendMessage(steamID, '💰 Your donation cart is empty.');
        }

        this.isDonating = false;

        cart.setNotify = true;
        cart.isDonating = true;

        await this.addCartToQueue(cart, true, false);
    }

    private async donateCartCommand(steamID: SteamID): Promise<void> {
        if (!this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're currently not donating to backpack.tf. If a cart already been created, cancel it with "!clearcart"`
            );
        }
        return this.bot.sendMessage(steamID, Cart.stringify(steamID, true));
    }

    private async buyBPTFPremiumCommand(steamID: SteamID, message: string): Promise<void> {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof PremiumCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one.'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (
            params.months === undefined ||
            typeof params.months !== 'number' ||
            !Number.isInteger(params.months) ||
            params.months < 1
        ) {
            return this.bot.sendMessage(
                steamID,
                '❌ Wrong syntax. Example: !premium months=1' +
                    '\n\n📌 Note: 📌\n- ' +
                    [
                        '1 month = 3 keys',
                        '2 months = 5 keys',
                        '3 months = 8 keys',
                        '4 months = 10 keys',
                        '1 year (12 months) = 30 keys'
                    ].join('\n- ')
            );
        }

        const amountMonths = params.months;
        const numMonths = params.months;
        const numOdds = numMonths % 2 !== 0 ? (numMonths - 1) / 2 + 1 : (numMonths - 1) / 2;
        const numEvens = numMonths - numOdds;
        const amountKeys = Math.round(numOdds * 3 + numEvens * 2);

        const ourAmount = this.bot.inventoryManager.getInventory.getAmount('5021;6', false, true);

        if (ourAmount < amountKeys) {
            return this.bot.sendMessage(
                steamID,
                `❌ I don't have enough keys to buy premium for ${pluralize(
                    'month',
                    amountMonths,
                    true
                )}. I have ${pluralize('key', ourAmount, true)} and need ${pluralize(
                    'key',
                    amountKeys - ourAmount,
                    true
                )} more.`
            );
        }

        if (params.i_am_sure !== 'yes_i_am') {
            return await this.bot.sendMessage(
                steamID,
                `⚠️ Are you sure that you want to buy premium for ${pluralize('month', amountMonths, true)}?` +
                    `\nThis will cost you ${pluralize('key', amountKeys, true)}.` +
                    `\nIf yes, retry by sending !premium months=${amountMonths}&i_am_sure=yes_i_am`
            );
        }

        const cart = new PremiumCart(
            steamID,
            this.bot,
            this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
            this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
        );

        cart.addOurItem('5021;6', amountKeys);
        Cart.addCart(cart);

        cart.setNotify = true;
        cart.isBuyingPremium = true;

        return this.addCartToQueue(cart, false, true);
    }
}
