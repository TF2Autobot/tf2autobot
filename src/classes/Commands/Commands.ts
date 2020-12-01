import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import moment from 'moment-timezone';
import Currencies from 'tf2-currencies';
import validUrl from 'valid-url';
import sleepasync from 'sleep-async';

import { botStatus, help, messageCommand, misc, pricelist, review, utils, options } from './export';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import Cart from '../Carts/Cart';
import AdminCart from '../Carts/AdminCart';
import UserCart from '../Carts/UserCart';
import MyHandler from '../MyHandler/MyHandler';
import CartQueue from '../Carts/CartQueue';
import Autokeys from '../Autokeys/Autokeys';

import { fixItem } from '../../lib/items';
import { requestCheck, getPrice, getSales } from '../../lib/ptf-api';
import log from '../../lib/logger';
import { ignoreWords } from '../../lib/data';
import { pure } from '../../lib/tools/export';
import DonateCart from '../Carts/DonateCart';

export = class Commands {
    private readonly bot: Bot;

    readonly autokeys: Autokeys;

    private isDonating = false;

    constructor(bot: Bot) {
        this.bot = bot;
        this.autokeys = new Autokeys(bot);
    }

    get cartQueue(): CartQueue {
        return (this.bot.getHandler() as MyHandler).cartQueue;
    }

    processMessage(steamID: SteamID, message: string): void {
        const command = CommandParser.getCommand(message.toLowerCase());

        const isAdmin = this.bot.isAdmin(steamID);

        const opt = this.bot.options;

        const isNoReply =
            ignoreWords.startsWith.some(word => {
                return message.startsWith(word);
            }) ||
            ignoreWords.endsWith.some(word => {
                return message.endsWith(word);
            });

        if (command === 'help') {
            help.helpCommand(steamID, this.bot);
        } else if (command === 'how2trade') {
            help.howToTradeCommand(steamID, this.bot);
        } else if (['price', 'pc'].includes(command)) {
            this.priceCommand(steamID, message);
        } else if (['buy', 'b'].includes(command)) {
            this.buyCommand(steamID, message);
        } else if (['sell', 's'].includes(command)) {
            this.sellCommand(steamID, message);
        } else if (command === 'buycart') {
            this.buyCartCommand(steamID, message);
        } else if (command === 'sellcart') {
            this.sellCartCommand(steamID, message);
        } else if (command === 'cart') {
            this.cartCommand(steamID, opt.weaponsAsCurrency.enable);
        } else if (command === 'clearcart') {
            this.clearCartCommand(steamID);
        } else if (command === 'checkout') {
            this.checkoutCommand(steamID);
        } else if (command === 'cancel') {
            this.cancelCommand(steamID);
        } else if (command === 'queue') {
            this.queueCommand(steamID);
        } else if (command === 'owner') {
            misc.ownerCommand(steamID, this.bot);
        } else if (command === 'discord') {
            misc.discordCommand(steamID, this.bot);
        } else if (command === 'more') {
            help.moreCommand(steamID, this.bot);
        } else if (command === 'autokeys') {
            this.autoKeysCommand(steamID);
        } else if (command === 'message') {
            messageCommand(steamID, message, this.bot);
        } else if (command === 'time') {
            misc.timeCommand(steamID, this.bot);
        } else if (command === 'uptime') {
            misc.uptimeCommand(steamID, this.bot);
        } else if (command === 'pure') {
            misc.pureCommand(steamID, this.bot);
        } else if (command === 'rate') {
            misc.rateCommand(steamID, this.bot);
        } else if (command === 'stock') {
            misc.stockCommand(steamID, this.bot);
        } else if (command === 'craftweapon') {
            misc.craftweaponCommand(steamID, this.bot);
        } else if (command === 'uncraftweapon') {
            misc.uncraftweaponCommand(steamID, this.bot);
        } else if (command === 'sales') {
            void this.getSalesCommand(steamID, message);
        } else if (['deposit', 'd'].includes(command) && isAdmin) {
            this.depositCommand(steamID, message);
        } else if (['withdraw', 'w'].includes(command) && isAdmin) {
            this.withdrawCommand(steamID, message);
        } else if (command === 'add' && isAdmin) {
            pricelist.addCommand(steamID, message, this.bot);
        } else if (command === 'update' && isAdmin) {
            pricelist.updateCommand(steamID, message, this.bot);
        } else if (command === 'remove' && isAdmin) {
            pricelist.removeCommand(steamID, message, this.bot);
        } else if (command === 'get' && isAdmin) {
            pricelist.getCommand(steamID, message, this.bot);
        } else if (command === 'shuffle' && isAdmin) {
            pricelist.shuffleCommand(steamID, this.bot);
        } else if (command === 'expand' && isAdmin) {
            this.expandCommand(steamID, message);
        } else if (command === 'delete' && isAdmin) {
            this.deleteCommand(steamID, message);
        } else if (command === 'name' && isAdmin) {
            this.nameCommand(steamID, message);
        } else if (command === 'avatar' && isAdmin) {
            this.avatarCommand(steamID, message);
        } else if (command === 'unblock' && isAdmin) {
            this.unblockCommand(steamID, message);
        } else if (command === 'block' && isAdmin) {
            this.blockCommand(steamID, message);
        } else if (command === 'stop' && isAdmin) {
            this.stopCommand(steamID);
        } else if (command === 'restart' && isAdmin) {
            this.restartCommand(steamID);
        } else if (command === 'refreshautokeys' && isAdmin) {
            this.refreshAutokeysCommand(steamID);
        } else if (command === 'refreshlist' && isAdmin) {
            this.refreshListingsCommand(steamID);
        } else if (command === 'resetqueue') {
            this.resetQueueCommand(steamID);
        } else if (command === 'stats' && isAdmin) {
            botStatus.statsCommand(steamID, this.bot);
        } else if (command === 'inventory' && isAdmin) {
            botStatus.inventoryCommand(steamID, this.bot);
        } else if (command === 'version' && isAdmin) {
            botStatus.versionCommand(steamID, this.bot);
        } else if (command === 'trades' && isAdmin) {
            review.tradesCommand(steamID, this.bot);
        } else if (command === 'trade' && isAdmin) {
            review.tradeCommand(steamID, message, this.bot);
        } else if (['accepttrade', 'accept'].includes(command) && isAdmin) {
            review.accepttradeCommand(steamID, message, this.bot);
        } else if (['declinetrade', 'decline'].includes(command) && isAdmin) {
            review.declinetradeCommand(steamID, message, this.bot);
        } else if (command === 'pricecheck' && isAdmin) {
            this.pricecheckCommand(steamID, message);
        } else if (command === 'pricecheckall' && isAdmin) {
            void this.pricecheckAllCommand(steamID);
        } else if (command === 'check' && isAdmin) {
            void this.checkCommand(steamID, message);
        } else if (command === 'find' && isAdmin) {
            pricelist.findCommand(steamID, message, this.bot);
        } else if (command === 'options' && isAdmin) {
            options.optionsCommand(steamID, this.bot);
        } else if (command === 'config' && isAdmin) {
            options.updateOptionsCommand(steamID, message, this.bot);
        } else if (command === 'donatebptf' && isAdmin) {
            this.donateBPTFCommand(steamID, message);
        } else if (command === 'donatenow' && isAdmin) {
            this.donateNowCommand(steamID);
        } else if (command === 'donatecart' && isAdmin) {
            this.donateCartCommand(steamID, opt.weaponsAsCurrency.enable);
        } else if (isNoReply) {
            return;
        } else {
            this.bot.sendMessage(
                steamID,
                opt.customMessage.iDontKnowWhatYouMean
                    ? opt.customMessage.iDontKnowWhatYouMean
                    : '❌ I don\'t know what you mean, please type "!help" for all of my commands!'
            );
        }
    }

    private priceCommand(steamID: SteamID, message: string): void {
        const info = utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot);

        if (info === null) {
            return;
        }

        const isAdmin = this.bot.isAdmin(steamID);

        const match = info.match;
        const amount = info.amount;

        let reply = '';

        const isBuying = match.intent === 0 || match.intent === 2;
        const isSelling = match.intent === 1 || match.intent === 2;

        const keyPrice = this.bot.pricelist.getKeyPrice();

        const isKey = match.sku === '5021;6';

        if (isBuying) {
            reply = '💲 I am buying ';

            if (amount !== 1) {
                reply += `${amount} `;
            }

            // If the amount is 1, then don't convert to value and then to currencies. If it is for keys, then don't use conversion rate
            const currencies =
                amount === 1
                    ? match.buy
                    : Currencies.toCurrencies(
                          match.buy.toValue(keyPrice.metal) * amount,
                          isKey ? undefined : keyPrice.metal
                      );

            reply += `${pluralize(match.name, 2)} for ${currencies.toString()}`;
        }

        if (isSelling) {
            const currencies =
                amount === 1
                    ? match.sell
                    : Currencies.toCurrencies(
                          match.sell.toValue(keyPrice.metal) * amount,
                          isKey ? undefined : keyPrice.metal
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

        reply += `.\n📦 I have ${this.bot.inventoryManager.getInventory().getAmount(match.sku)}`;

        if (match.max !== -1 && isBuying) {
            reply += ` / ${match.max}`;
        }

        if (isSelling && match.min !== 0) {
            reply += ` and I can sell ${this.bot.inventoryManager.amountCanTrade(match.sku, false)}`;
        }

        reply += '. ';

        if (match.autoprice && isAdmin) {
            reply += ` (price last updated ${moment.unix(match.time).fromNow()})`;
        }

        this.bot.sendMessage(steamID, reply);
    }

    // Instant item trade

    private buyCommand(steamID: SteamID, message: string): void {
        const info = utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot);

        if (info === null) {
            return;
        }

        const match = info.match;
        const amount = info.amount;

        const cart = new UserCart(steamID, this.bot);
        cart.setNotify(true);

        cart.addOurItem(match.sku, amount);

        this.addCartToQueue(cart, false);
    }

    private sellCommand(steamID: SteamID, message: string): void {
        const info = utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot);

        if (info === null) {
            return;
        }

        const match = info.match;
        const amount = info.amount;

        const cart = new UserCart(steamID, this.bot);
        cart.setNotify(true);

        cart.addTheirItem(match.sku, amount);

        this.addCartToQueue(cart, false);
    }

    // Multiple items trade

    private buyCartCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof UserCart)) {
            this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
            return;
        }

        const info = utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot);

        if (info === null) {
            return;
        }

        const match = info.match;
        let amount = info.amount;

        const cart = Cart.getCart(steamID) || new UserCart(steamID, this.bot);

        const cartAmount = cart.getOurCount(match.sku);
        const ourAmount = this.bot.inventoryManager.getInventory().getAmount(match.sku);
        const amountCanTrade = this.bot.inventoryManager.amountCanTrade(match.sku, false) - cartAmount;

        const name = this.bot.schema.getName(SKU.fromString(match.sku), false);

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            this.bot.sendMessage(
                steamID,
                'I ' +
                    (ourAmount > 0 ? "can't sell" : "don't have") +
                    ` any ${(cartAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
            return;
        }

        if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                this.bot.sendMessage(
                    steamID,
                    `I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
                return;
            }

            this.bot.sendMessage(
                steamID,
                `I can only sell ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)}` +
                    ' has been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        }

        cart.addOurItem(match.sku, amount);

        Cart.addCart(cart);
    }

    private sellCartCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof UserCart)) {
            this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
            return;
        }

        const info = utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot);

        if (info === null) {
            return;
        }

        const match = info.match;
        let amount = info.amount;

        const cart = Cart.getCart(steamID) || new UserCart(steamID, this.bot);

        const cartAmount = cart.getOurCount(match.sku);
        const ourAmount = this.bot.inventoryManager.getInventory().getAmount(match.sku);
        const amountCanTrade = this.bot.inventoryManager.amountCanTrade(match.sku, true) - cartAmount;

        const name = this.bot.schema.getName(SKU.fromString(match.sku), false);

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            this.bot.sendMessage(
                steamID,
                'I ' +
                    (ourAmount > 0 ? "can't buy" : "don't want") +
                    ` any ${(cartAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
            return;
        }

        if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                this.bot.sendMessage(steamID, `I unable to trade any more ${pluralize(name, 0)}.`);
                return;
            }

            this.bot.sendMessage(
                steamID,
                `I can only buy ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)}` +
                    ' has been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        }

        cart.addTheirItem(match.sku, amount);

        Cart.addCart(cart);
    }

    private cartCommand(steamID: SteamID, enableCraftweaponsAsCurrency: boolean): void {
        if (this.isDonating) {
            this.bot.sendMessage(
                steamID,
                `You're about to send donation. Send "!donatecart" to view your donation cart summary or "!donatenow" to send donation now.`
            );
            return;
        }
        this.bot.sendMessage(steamID, Cart.stringify(steamID, enableCraftweaponsAsCurrency, false));
    }

    private clearCartCommand(steamID: SteamID): void {
        Cart.removeCart(steamID);

        this.bot.sendMessage(steamID, '🛒 Your cart has been cleared.');
    }

    private checkoutCommand(steamID: SteamID): void {
        if (this.isDonating) {
            this.bot.sendMessage(
                steamID,
                `You're about to send donation. Send "!donatecart" to view your donation cart summary or "!donatenow" to send donation now.`
            );
            return;
        }

        const cart = Cart.getCart(steamID);

        if (cart === null) {
            this.bot.sendMessage(steamID, '🛒 Your cart is empty.');
            return;
        }

        cart.setNotify(true);

        cart.isDonating(false);

        this.addCartToQueue(cart, false);
    }

    // Trade actions

    private cancelCommand(steamID: SteamID): void {
        // Maybe have the cancel command only cancel the offer in the queue, and have a command for canceling the offer?

        const positionInQueue = this.cartQueue.getPosition(steamID);

        // If a user is in the queue, then they can't have an active offer

        if (positionInQueue === 0) {
            // The user is in the queue and the offer is already being processed
            const cart = this.cartQueue.getCart(steamID);

            if (cart.isMade()) {
                this.bot.sendMessage(
                    steamID,
                    '⚠️ Your offer is already being sent! Please try again when the offer is active.'
                );
                return;
            } else if (cart.isCanceled()) {
                this.bot.sendMessage(
                    steamID,
                    '⚠️ Your offer is already being canceled. Please wait a few seconds for it to be canceled.'
                );
                return;
            }

            cart.setCanceled('BY_USER');
        } else if (positionInQueue !== -1) {
            // The user is in the queue
            this.cartQueue.dequeue(steamID);
            this.bot.sendMessage(steamID, '✅ You have been removed from the queue.');
        } else {
            // User is not in the queue, check if they have an active offer

            const activeOffer = this.bot.trades.getActiveOffer(steamID);

            if (activeOffer === null) {
                this.bot.sendMessage(steamID, "❌ You don't have an active offer.");
                return;
            }

            void this.bot.trades.getOffer(activeOffer).asCallback((err, offer) => {
                if (err) {
                    this.bot.sendMessage(
                        steamID,
                        '❌ Ohh nooooes! Something went wrong while trying to cancel the offer.'
                    );
                    return;
                }

                offer.data('canceledByUser', true);

                offer.cancel(err => {
                    // Only react to error, if the offer is canceled then the user
                    // will get an alert from the onTradeOfferChanged handler

                    if (err) {
                        this.bot.sendMessage(
                            steamID,
                            '❌ Ohh nooooes! Something went wrong while trying to cancel the offer.'
                        );
                    }
                });
            });
        }
    }

    private addCartToQueue(cart: Cart, isDonating: boolean): void {
        const activeOfferID = this.bot.trades.getActiveOffer(cart.partner);

        if (activeOfferID !== null) {
            this.bot.sendMessage(
                cart.partner,
                `❌ You already have an active offer! Please finish it before requesting a new one:  https://steamcommunity.com/tradeoffer/${activeOfferID}/`
            );
            return;
        }

        const currentPosition = this.cartQueue.getPosition(cart.partner);

        if (currentPosition !== -1) {
            if (currentPosition === 0) {
                this.bot.sendMessage(
                    cart.partner,
                    '⚠️ You are already in the queue! Please wait while I process your offer.'
                );
            } else {
                this.bot.sendMessage(
                    cart.partner,
                    '⚠️ You are already in the queue! Please wait your turn, there ' +
                        (currentPosition !== 1 ? 'are' : 'is') +
                        ` ${currentPosition} infront of you.`
                );
            }
            return;
        }

        const position = this.cartQueue.enqueue(cart, isDonating);

        if (position !== 0) {
            this.bot.sendMessage(
                cart.partner,
                '✅ You have been added to the queue! Please wait your turn, there ' +
                    (position !== 1 ? 'are' : 'is') +
                    ` ${position} infront of you.`
            );
        }
    }

    private queueCommand(steamID: SteamID): void {
        const position = (this.bot.handler as MyHandler).cartQueue.getPosition(steamID);

        if (position === -1) {
            this.bot.sendMessage(steamID, '❌ You are not in the queue.');
        } else if (position === 0) {
            this.bot.sendMessage(steamID, '⌛ Your offer is being made.');
        } else {
            this.bot.sendMessage(steamID, `There are ${position} users ahead of you.`);
        }
    }

    // under !more command

    private async getSalesCommand(steamID: SteamID, message: string): Promise<void> {
        message = utils.removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.sku === undefined) {
            const item = utils.getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), this.bot.schema));
        const item = SKU.fromString(params.sku);
        const name = this.bot.schema.getName(item);

        let salesData: getSalesData;

        try {
            salesData = (await getSales(params.sku, 'bptf')) as getSalesData;
        } catch (err) {
            const thisErr = err as ErrorRequest;
            this.bot.sendMessage(
                steamID,
                `❌ Error getting sell snapshots for ${name === null ? (params.sku as string) : name}: ${
                    thisErr.body && thisErr.body.message ? thisErr.body.message : thisErr.message
                }`
            );
            return;
        }

        if (!salesData) {
            this.bot.sendMessage(
                steamID,
                `❌ No recorded snapshots found for ${name === null ? (params.sku as string) : name}.`
            );
            return;
        }

        if (salesData.sales.length === 0) {
            this.bot.sendMessage(
                steamID,
                `❌ No recorded snapshots found for ${name === null ? (params.sku as string) : name}.`
            );
            return;
        }

        const sales: {
            seller: string;
            itemHistory: string;
            keys: number;
            metal: number;
            date: number;
        }[] = [];

        salesData.sales.forEach(sale => {
            sales.push({
                seller: 'https://backpack.tf/profiles/' + sale.steamid,
                itemHistory: 'https://backpack.tf/item/' + sale.id.replace('440_', ''),
                keys: sale.currencies.keys,
                metal: sale.currencies.metal,
                date: sale.time
            });
        });

        sales.sort((a, b) => {
            return b.date - a.date;
        });

        let left = 0;
        const SalesList: string[] = [];

        for (let i = 0; i < sales.length; i++) {
            if (SalesList.length > 40) {
                left += 1;
            } else {
                SalesList.push(
                    `Listed #${i + 1}-----\n• Date: ${moment.unix(sales[i].date).utc().toString()}\n• Item: ${
                        sales[i].itemHistory
                    }\n• Seller: ${sales[i].seller}\n• Was selling for: ${
                        sales[i].keys > 0 ? `${sales[i].keys} keys,` : ''
                    } ${sales[i].metal} ref`
                );
            }
        }

        let reply = `🔎 Recorded removed sell listings from backpack.tf\n\nItem name: ${
            salesData.name
        }\n\n-----${SalesList.join('\n\n-----')}`;
        if (left > 0) {
            reply += `,\n\nand ${left} other ${pluralize('sale', left)}`;
        }

        this.bot.sendMessage(steamID, reply);
    }

    // Admin commands

    private depositCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
            return;
        }

        message = utils.removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (params.sku === undefined) {
            const item = utils.getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        const sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        const amount = typeof params.amount === 'number' ? params.amount : 1;

        const cart = AdminCart.getCart(steamID) || new AdminCart(steamID, this.bot);

        cart.addTheirItem(sku, amount);

        Cart.addCart(cart);

        const name = this.bot.schema.getName(SKU.fromString(sku), false);

        this.bot.sendMessage(
            steamID,
            `✅ ${pluralize(name, Math.abs(amount), true)} has been ` +
                (amount >= 0 ? 'added to' : 'removed from') +
                ' your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
        );
    }

    private withdrawCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
            return;
        }

        message = utils.removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (params.sku === undefined) {
            const item = utils.getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        const sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        let amount = typeof params.amount === 'number' ? params.amount : 1;

        const cart = AdminCart.getCart(steamID) || new AdminCart(steamID, this.bot);

        const cartAmount = cart.getOurCount(sku);
        const ourAmount = this.bot.inventoryManager.getInventory().getAmount(sku);
        const amountCanTrade = ourAmount - cart.getOurCount(sku) - cartAmount;

        const name = this.bot.schema.getName(SKU.fromString(sku), false);

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            this.bot.sendMessage(
                steamID,
                `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
            amount = 0;
        } else if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                this.bot.sendMessage(
                    steamID,
                    `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
                return;
            }

            this.bot.sendMessage(
                steamID,
                `I only have ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)} has been ` +
                    (amount >= 0 ? 'added to' : 'removed from') +
                    ' your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        }

        cart.addOurItem(sku, amount);

        Cart.addCart(cart);
    }

    private donateBPTFCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof DonateCart)) {
            this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one.'
            );
            return;
        }

        message = utils.removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (params.sku === undefined) {
            const item = utils.getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        const sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        const name = this.bot.schema.getName(SKU.fromString(sku), false);

        if (!['725;6;uncraftable', '5021;6', '126;6', '143;6', '162;6'].includes(sku)) {
            this.bot.sendMessage(
                steamID,
                `❌ Invalid item ${name}. Items that can only be donated to Backpack.tf:` +
                    '\n• Non-Craftable Tour of Duty Ticket (725;6;uncraftable)' +
                    '\n• Mann Co. Supply Crate Key (5021;6)' +
                    "\n• Bill's Hat (126;6)" +
                    '\n• Earbuds (143;6)' +
                    "\n• Max's Severed Head (162;6)" +
                    '\n\nhttps://backpack.tf/donate'
            );
            return;
        }

        let amount = typeof params.amount === 'number' ? params.amount : 1;

        const cart = DonateCart.getCart(steamID) || new DonateCart(steamID, this.bot);

        const cartAmount = cart.getOurCount(sku);
        const ourAmount = this.bot.inventoryManager.getInventory().getAmount(sku);
        const amountCanTrade = ourAmount - cart.getOurCount(sku) - cartAmount;

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            this.bot.sendMessage(
                steamID,
                `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
            );
            amount = 0;
        } else if (amount > amountCanTrade) {
            amount = amountCanTrade;

            if (amount === cartAmount && cartAmount > 0) {
                this.bot.sendMessage(
                    steamID,
                    `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
                return;
            }

            this.bot.sendMessage(
                steamID,
                `I only have ${pluralize(name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your donate cart. Type "!donatecart" to view your donation cart summary or "!donatenow" to donate. 💰'
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)} has been ` +
                    (amount >= 0 ? 'added to' : 'removed from') +
                    ' your donate cart. Type "!donatecart" to view your donation cart summary or "!donatenow" to donate. 💰'
            );
        }

        this.isDonating = true;

        cart.addOurItem(sku, amount);

        Cart.addCart(cart);
    }

    private donateNowCommand(steamID: SteamID): void {
        if (!this.isDonating) {
            this.bot.sendMessage(
                steamID,
                `You're currently not donating to backpack.tf. If a cart already been created, cancel it with "!clearcart"`
            );
            return;
        }
        const cart = Cart.getCart(steamID);

        if (cart === null) {
            this.bot.sendMessage(steamID, '💰 Your donation cart is empty.');
            return;
        }

        this.isDonating = false;

        cart.setNotify(true);

        cart.isDonating(true);

        this.addCartToQueue(cart, true);
    }

    private donateCartCommand(steamID: SteamID, enableCraftweaponsAsCurrency: boolean): void {
        if (!this.isDonating) {
            this.bot.sendMessage(
                steamID,
                `You're currently not donating to backpack.tf. If a cart already been created, cancel it with "!clearcart"`
            );
            return;
        }
        this.bot.sendMessage(steamID, Cart.stringify(steamID, enableCraftweaponsAsCurrency, true));
    }

    // Bot manager commands

    private expandCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (typeof params.craftable !== 'boolean') {
            this.bot.sendMessage(steamID, '⚠️ Missing `craftable=true|false`');
            return;
        }

        const item = SKU.fromString('5050;6');

        if (params.craftable === false) {
            item.craftable = false;
        }

        const assetids = this.bot.inventoryManager.getInventory().findBySKU(SKU.fromObject(item), false);

        const name = this.bot.schema.getName(item);

        if (assetids.length === 0) {
            // No backpack expanders
            this.bot.sendMessage(steamID, `❌ I couldn't find any ${pluralize(name, 0)}`);
            return;
        }

        this.bot.tf2gc.useItem(assetids[0], err => {
            if (err) {
                log.warn('Error trying to expand inventory: ', err);
                this.bot.sendMessage(steamID, `❌ Failed to expand inventory: ${err.message}`);
                return;
            }

            this.bot.sendMessage(steamID, `✅ Used ${name}!`);
        });
    }

    private deleteCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.sku !== undefined && !utils.testSKU(params.sku as string)) {
            this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
            return;
        }

        if (params.assetid !== undefined && params.sku === undefined) {
            // This most likely not working with Non-Tradable items.
            const ourInventory = this.bot.inventoryManager.getInventory();

            const targetedAssetId = params.assetid as string;
            const sku = ourInventory.findByAssetid(targetedAssetId);

            if (sku === null) {
                if (params.i_am_sure !== 'yes_i_am') {
                    this.bot.sendMessage(
                        steamID,
                        `/pre ⚠️ Are you sure that you want to delete the item with asset ID ${targetedAssetId}?` +
                            `\n⚠️ This process is irreversible and will delete the item from your bot's backpack!` +
                            `\n⚠️ If you are sure, try again with i_am_sure=yes_i_am as a parameter`
                    );
                    return;
                }

                this.bot.tf2gc.deleteItem(targetedAssetId, err => {
                    if (err) {
                        log.warn(`Error trying to delete ${targetedAssetId}: `, err);
                        this.bot.sendMessage(steamID, `❌ Failed to delete ${targetedAssetId}: ${err.message}`);
                        return;
                    }
                    this.bot.sendMessage(steamID, `✅ Deleted ${targetedAssetId}!`);
                });
                return;
            } else {
                const item = SKU.fromString(sku);
                const name = this.bot.schema.getName(item, false);

                if (params.i_am_sure !== 'yes_i_am') {
                    this.bot.sendMessage(
                        steamID,
                        `/pre ⚠️ Are you sure that you want to delete ${name}?` +
                            `\n⚠️ This process is irreversible and will delete the item from your bot's backpack!` +
                            `\n⚠️ If you are sure, try again with i_am_sure=yes_i_am as a parameter`
                    );
                    return;
                }

                this.bot.tf2gc.deleteItem(targetedAssetId, err => {
                    if (err) {
                        log.warn(`Error trying to delete ${name}: `, err);
                        this.bot.sendMessage(
                            steamID,
                            `❌ Failed to delete ${name}(${targetedAssetId}): ${err.message}`
                        );
                        return;
                    }
                    this.bot.sendMessage(steamID, `✅ Deleted ${name}(${targetedAssetId})!`);
                });
                return;
            }
        }

        if (params.name !== undefined || params.item !== undefined) {
            this.bot.sendMessage(
                steamID,
                '⚠️ Please only use sku property.' +
                    '\n\nBelow are some common items to delete:' +
                    '\n• Smissamas Sweater: 16391;15;untradable;w1;pk391' +
                    '\n• Soul Gargoyle: 5826;6;uncraftable;untradable' +
                    '\n• Noice Maker - TF Birthday: 536;6;untradable' +
                    '\n• Bronze Dueling Badge: 242;6;untradable' +
                    '\n• Silver Dueling Badge: 243;6;untradable' +
                    '\n• Gold Dueling Badge: 244;6;untradable' +
                    '\n• Platinum Dueling Badge: 245;6;untradable' +
                    '\n• Mercenary: 166;6;untradable' +
                    '\n• Soldier of Fortune: 165;6;untradable' +
                    '\n• Grizzled Veteran: 164;6;untradable' +
                    '\n• Primeval Warrior: 170;6;untradable' +
                    '\n• Professor Speks: 343;6;untradable' +
                    '\n• Mann Co. Cap: 261;6;untradable' +
                    '\n• Mann Co. Online Cap: 994;6;untradable' +
                    '\n• Proof of Purchase: 471;6;untradable' +
                    '\n• Mildly Disturbing Halloween Mask: 115;6;untradable' +
                    '\n• Seal Mask: 582;6;untradable' +
                    '\n• Pyrovision Goggles: 743;6;untradable' +
                    '\n• Giftapult: 5083;6;untradable' +
                    '\n• Spirit Of Giving: 655;11;untradable' +
                    '\n• Party Hat: 537;6;untradable' +
                    '\n• Name Tag: 5020;6;untradable' +
                    '\n• Description Tag: 5044;6;untradable' +
                    '\n• Ghastly Gibus: 584;6;untradable' +
                    '\n• Ghastlier Gibus: 279;6;untradable' +
                    '\n• Power Up Canteen: 489;6;untradable' +
                    '\n• Bombinomicon: 583;6;untradable' +
                    '\n• Skull Island Topper: 941;6;untradable' +
                    '\n• Spellbook Page: 8935;6;untradable' +
                    '\n• Gun Mettle Campaign Coin: 5809;6;untradable' +
                    '\n• MONOCULUS!: 581;6;untradable' +
                    '\n\nOr other items, please refer here: https://bit.ly/3gZQxFQ (defindex)'
            );
            return;
        }

        if (params.sku === undefined) {
            this.bot.sendMessage(steamID, '⚠️ Missing sku property. Example: "!delete sku=536;6;untradable"');
            return;
        }

        const targetedSKU = params.sku as string;

        const uncraft = targetedSKU.includes(';uncraftable');
        const untrade = targetedSKU.includes(';untradable');

        params.sku = targetedSKU.replace(';uncraftable', '');
        params.sku = targetedSKU.replace(';untradable', '');
        const item = SKU.fromString(targetedSKU);

        if (uncraft) {
            item.craftable = !uncraft;
        }

        if (untrade) {
            item.tradable = !untrade;
        }

        const assetids = this.bot.inventoryManager.getInventory().findBySKU(SKU.fromObject(item), false);

        const name = this.bot.schema.getName(item, false);

        if (assetids.length === 0) {
            // Item not found
            this.bot.sendMessage(steamID, `❌ I couldn't find any ${pluralize(name, 0)}`);
            return;
        }

        let assetid: string;
        if (params.assetid !== undefined) {
            const targetedAssetId = params.assetid as string;

            if (assetids.includes(targetedAssetId)) {
                assetid = targetedAssetId;
            } else {
                this.bot.sendMessage(
                    steamID,
                    `❌ Looks like an assetid ${targetedAssetId} did not match any assetids associated with ${name}(${targetedSKU}) in my inventory. Try using the sku to delete a random assetid.`
                );
                return;
            }
        } else {
            assetid = assetids[0];
        }

        if (params.i_am_sure !== 'yes_i_am') {
            this.bot.sendMessage(
                steamID,
                `/pre ⚠️ Are you sure that you want to delete ${name}?` +
                    `\n⚠️ This process is irreversible and will delete the item from your bot's backpack!` +
                    `\n⚠️ If you are sure, try again with i_am_sure=yes_i_am as a parameter`
            );
            return;
        }

        this.bot.tf2gc.deleteItem(assetid, err => {
            if (err) {
                log.warn(`Error trying to delete ${name}: `, err);
                this.bot.sendMessage(steamID, `❌ Failed to delete ${name}(${assetid}): ${err.message}`);
                return;
            }

            this.bot.sendMessage(steamID, `✅ Deleted ${name}(${assetid})!`);
        });
    }

    private nameCommand(steamID: SteamID, message: string): void {
        const newName = CommandParser.removeCommand(message);

        if (!newName || newName === '!name') {
            this.bot.sendMessage(steamID, '❌ You forgot to add a name. Example: "!name IdiNium"');
            return;
        }

        this.bot.community.editProfile(
            {
                name: newName
            },
            err => {
                if (err) {
                    log.warn('Error while changing name: ', err);
                    this.bot.sendMessage(steamID, `❌ Error while changing name: ${err.message}`);
                    return;
                }

                this.bot.sendMessage(steamID, '✅ Successfully changed name.');
            }
        );
    }

    private avatarCommand(steamID: SteamID, message: string): void {
        const imageUrl = CommandParser.removeCommand(message);

        if (!imageUrl || imageUrl === '!avatar') {
            this.bot.sendMessage(
                steamID,
                '❌ You forgot to add an image url. Example: "!avatar https://steamuserimages-a.akamaihd.net/ugc/949595415286366323/8FECE47652C9D77501035833E937584E30D0F5E7/"'
            );
            return;
        }

        if (!validUrl.isUri(imageUrl)) {
            this.bot.sendMessage(
                steamID,
                '❌ Your url is not valid. Example: "!avatar https://steamuserimages-a.akamaihd.net/ugc/949595415286366323/8FECE47652C9D77501035833E937584E30D0F5E7/"'
            );
            return;
        }

        this.bot.community.uploadAvatar(imageUrl, err => {
            if (err) {
                log.warn('Error while uploading new avatar: ', err);
                this.bot.sendMessage(steamID, `❌ Error while uploading a new avatar: ${err.message}`);
                return;
            }

            this.bot.sendMessage(steamID, '✅ Successfully uploaded a new avatar.');
        });
    }

    private blockCommand(steamID: SteamID, message: string): void {
        const steamid = CommandParser.removeCommand(message);

        if (!steamid || steamid === '!block') {
            this.bot.sendMessage(steamID, '❌ You forgot to add their SteamID64. Example: 76561198798404909');
            return;
        }

        const targetSteamID64 = new SteamID(steamid);

        if (!targetSteamID64.isValid()) {
            this.bot.sendMessage(steamID, '❌ SteamID is not valid. Example: 76561198798404909');
            return;
        }

        const sendMessage = this.bot;

        this.bot.client.blockUser(targetSteamID64, err => {
            if (err) {
                log.warn(`Failed to block user ${targetSteamID64.getSteamID64()}: `, err);
                sendMessage.sendMessage(
                    steamID,
                    `❌ Failed to block user ${targetSteamID64.getSteamID64()}: ${err.message}`
                );
                return;
            }
            sendMessage.sendMessage(steamID, `✅ Successfully blocked user ${targetSteamID64.getSteamID64()}`);
        });
    }

    private unblockCommand(steamID: SteamID, message: string): void {
        const steamid = CommandParser.removeCommand(message);

        if (!steamid || steamid === '!unblock') {
            this.bot.sendMessage(steamID, '❌ You forgot to add their SteamID64. Example: 76561198798404909');
            return;
        }

        const targetSteamID64 = new SteamID(steamid);

        if (!targetSteamID64.isValid()) {
            this.bot.sendMessage(steamID, '❌ SteamID is not valid. Example: 76561198798404909');
            return;
        }

        const sendMessage = this.bot;

        this.bot.client.unblockUser(targetSteamID64, err => {
            if (err) {
                log.warn(`Failed to unblock user ${targetSteamID64.getSteamID64()}: `, err);
                sendMessage.sendMessage(
                    steamID,
                    `❌ Failed to unblock user ${targetSteamID64.getSteamID64()}: ${err.message}`
                );
                return;
            }
            sendMessage.sendMessage(steamID, `✅ Successfully unblocked user ${targetSteamID64.getSteamID64()}`);
        });
    }

    private stopCommand(steamID: SteamID): void {
        this.bot.sendMessage(steamID, '⌛ Stopping...');

        this.bot.botManager.stopProcess().catch((err: Error) => {
            log.warn('Error occurred while trying to stop: ', err);
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            this.bot.sendMessage(steamID, `❌ An error occurred while trying to stop: ${err.message}`);
        });
    }

    private restartCommand(steamID: SteamID): void {
        this.bot.sendMessage(steamID, '⌛ Restarting...');

        this.bot.botManager
            .restartProcess()
            .then(restarting => {
                if (!restarting) {
                    this.bot.sendMessage(
                        steamID,
                        '❌ You are not running the bot with PM2! Get a VPS and run your bot with PM2: https://github.com/idinium96/tf2autobot/wiki/Getting-a-VPS'
                    );
                }
            })
            .catch((err: Error) => {
                log.warn('Error occurred while trying to restart: ', err);
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                this.bot.sendMessage(steamID, `❌ An error occurred while trying to restart: ${err.message}`);
            });
    }

    private autoKeysCommand(steamID: SteamID): void {
        if (this.autokeys.isEnabled === false) {
            this.bot.sendMessage(steamID, `This feature is disabled.`);
            return;
        }

        const autokeys = this.autokeys;

        const pureNow = pure.currPure(this.bot);
        const currKey = pureNow.key;
        const currRef = pureNow.refTotalInScrap;

        const keyPrices = this.bot.pricelist.getKeyPrices();

        const userPure = autokeys.userPure;
        const status = (this.bot.handler as MyHandler).getAutokeysStatus();

        const keyBlMin = `       X`;
        const keyAbMax = `                     X`;
        const keyAtBet = `              X`;
        const keyAtMin = `         X`;
        const keyAtMax = `                   X`;
        const keysLine = `Keys ————|—————————|————▶`;
        const refBlMin = `       X`;
        const refAbMax = `                     X`;
        const refAtBet = `              X`;
        const refAtMin = `         X`;
        const refAtMax = `                   X`;
        const refsLine = `Refs ————|—————————|————▶`;
        const xAxisRef = `        min       max`;
        const keysPosition =
            currKey < userPure.minKeys
                ? keyBlMin
                : currKey > userPure.maxKeys
                ? keyAbMax
                : currKey > userPure.minKeys && currKey < userPure.maxKeys
                ? keyAtBet
                : currKey === userPure.minKeys
                ? keyAtMin
                : currKey === userPure.maxKeys
                ? keyAtMax
                : '';
        const refsPosition =
            currRef < userPure.minRefs
                ? refBlMin
                : currRef > userPure.maxRefs
                ? refAbMax
                : currRef > userPure.minRefs && currRef < userPure.maxRefs
                ? refAtBet
                : currRef === userPure.minRefs
                ? refAtMin
                : currRef === userPure.maxRefs
                ? refAtMax
                : '';
        const summary = `\n• ${userPure.minKeys} ≤ ${pluralize('key', currKey)}(${currKey}) ≤ ${
            userPure.maxKeys
        }\n• ${Currencies.toRefined(userPure.minRefs)} < ${pluralize(
            'ref',
            Currencies.toRefined(currRef)
        )}(${Currencies.toRefined(currRef)}) < ${Currencies.toRefined(userPure.maxRefs)}`;

        const isAdmin = this.bot.isAdmin(steamID);

        let reply =
            (isAdmin ? 'Your ' : 'My ') +
            `current Autokeys settings:\n${summary}\n\nDiagram:\n${keysPosition}\n${keysLine}\n${refsPosition}\n${refsLine}\n${xAxisRef}\n`;
        reply += `\n       Key price: ${keyPrices.buy.metal}/${keyPrices.sell.toString()} (${
            keyPrices.src === 'manual' ? 'manual' : 'prices.tf'
        })`;
        reply += `\nScrap Adjustment: ${autokeys.isEnableScrapAdjustment ? 'Enabled ✅' : 'Disabled ❌'}`;
        reply += `\n    Auto-banking: ${autokeys.isKeyBankingEnabled ? 'Enabled ✅' : 'Disabled ❌'}`;
        reply += `\n Autokeys status: ${
            status.isActive
                ? status.isBanking
                    ? 'Banking' + (autokeys.isEnableScrapAdjustment ? ' (default price)' : '')
                    : status.isBuying
                    ? 'Buying for ' +
                      Currencies.toRefined(
                          keyPrices.buy.toValue() +
                              (autokeys.isEnableScrapAdjustment ? autokeys.scrapAdjustmentValue : 0)
                      ).toString() +
                      ' ref' +
                      (autokeys.isEnableScrapAdjustment ? ` (+${autokeys.scrapAdjustmentValue} scrap)` : '')
                    : 'Selling for ' +
                      Currencies.toRefined(
                          keyPrices.sell.toValue() -
                              (autokeys.isEnableScrapAdjustment ? autokeys.scrapAdjustmentValue : 0)
                      ).toString() +
                      ' ref' +
                      (autokeys.isEnableScrapAdjustment ? ` (-${autokeys.scrapAdjustmentValue} scrap)` : '')
                : 'Not active'
        }`;
        /*
        //        X
        // Keys ————|—————————|————▶
        //                       X
        // Refs ————|—————————|————▶
        //         min       max
        */

        this.bot.sendMessage(steamID, '/pre ' + reply);
    }

    private refreshAutokeysCommand(steamID: SteamID): void {
        if (this.autokeys.isEnabled === false) {
            this.bot.sendMessage(steamID, `This feature is disabled.`);
            return;
        }

        this.autokeys.refresh();
        this.bot.sendMessage(steamID, '✅ Successfully refreshed Autokeys.');
    }

    private resetQueueCommand(steamID: SteamID): void {
        this.cartQueue.resetQueue();
        this.bot.sendMessage(steamID, '✅ Sucessfully reset queue!');
    }

    private refreshListingsCommand(steamID: SteamID): void {
        const inventory = this.bot.inventoryManager.getInventory();
        const pricelist = this.bot.pricelist.getPrices().filter(entry => {
            // Filter our pricelist to only the items that the bot currently have.
            return inventory.findBySKU(entry.sku).length > 0;
        });

        if (pricelist.length > 0) {
            log.debug('Checking listings for ' + pluralize('item', pricelist.length, true) + '...');
            this.bot.sendMessage(
                steamID,
                'Refreshing listings for ' + pluralize('item', pricelist.length, true) + '...'
            );
            void this.bot.listings.recursiveCheckPricelistWithDelay(pricelist).asCallback(() => {
                log.debug('Done checking ' + pluralize('item', pricelist.length, true));
                this.bot.sendMessage(steamID, '✅ Done refreshing ' + pluralize('item', pricelist.length, true));
            });
        } else {
            this.bot.sendMessage(steamID, '❌ Nothing to refresh.');
        }
    }

    // Request commands

    private pricecheckCommand(steamID: SteamID, message: string): void {
        message = utils.removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.sku !== undefined && !utils.testSKU(params.sku as string)) {
            this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
            return;
        }

        if (params.sku === undefined) {
            const item = utils.getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), this.bot.schema));
        const name = this.bot.schema.getName(SKU.fromString(params.sku), false);

        void requestCheck(params.sku, 'bptf').asCallback((err, body: PriceCheckRequest) => {
            if (err) {
                const thisErr = err as ErrorRequest;
                this.bot.sendMessage(
                    steamID,
                    `❌ Error while requesting price check: ${
                        thisErr.body && thisErr.body.message ? thisErr.body.message : thisErr.message
                    }`
                );
                return;
            }

            this.bot.sendMessage(
                steamID,
                `⌛ Price check requested for ${
                    body.name.includes('War Paint') ||
                    body.name.includes('Mann Co. Supply Crate Series #') ||
                    body.name.includes('Salvaged Mann Co. Supply Crate #')
                        ? name
                        : body.name
                }, the item will be checked.`
            );
        });
    }

    private async pricecheckAllCommand(steamID): Promise<void> {
        const pricelist = this.bot.pricelist.getPrices();

        const total = pricelist.length;
        const totalTime = total * 2 * 1000;
        const aSecond = 1 * 1000;
        const aMin = 1 * 60 * 1000;
        const anHour = 1 * 60 * 60 * 1000;
        this.bot.sendMessage(
            steamID,
            `⌛ Price check requested for ${total} items. It will be completed in approximately ${
                totalTime < aMin
                    ? `${Math.round(totalTime / aSecond)} seconds.`
                    : totalTime < anHour
                    ? `${Math.round(totalTime / aMin)} minutes.`
                    : `${Math.round(totalTime / anHour)} hours.`
            } (about 2 seconds for each item).`
        );

        const skus = pricelist.map(entry => entry.sku);

        let submitted = 0;
        let success = 0;
        let failed = 0;
        for (const sku of skus) {
            await sleepasync().Promise.sleep(2 * 1000);
            void requestCheck(sku, 'bptf').asCallback(err => {
                if (err) {
                    const thisErr = err as ErrorRequest;
                    submitted++;
                    failed++;
                    log.warn(
                        `pricecheck failed for ${sku}: ${
                            thisErr.body && thisErr.body.message ? thisErr.body.message : thisErr.message
                        }`
                    );
                    log.debug(
                        `pricecheck for ${sku} failed, status: ${submitted}/${total}, ${success} success, ${failed} failed.`
                    );
                } else {
                    submitted++;
                    success++;
                    log.debug(
                        `pricecheck for ${sku} success, status: ${submitted}/${total}, ${success} success, ${failed} failed.`
                    );
                }
                if (submitted === total) {
                    this.bot.sendMessage(
                        steamID,
                        `✅ Successfully completed pricecheck for all ${total} ${pluralize('item', total)}!`
                    );
                }
            });
        }
    }

    private async checkCommand(steamID: SteamID, message: string): Promise<void> {
        message = utils.removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.sku !== undefined && !utils.testSKU(params.sku as string)) {
            this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
            return;
        }

        if (params.sku === undefined) {
            const item = utils.getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), this.bot.schema));
        const item = SKU.fromString(params.sku);
        const name = this.bot.schema.getName(item);

        let price: GetPrices;

        try {
            price = (await getPrice(params.sku, 'bptf')) as GetPrices;
        } catch (err) {
            const thisErr = err as ErrorRequest;
            this.bot.sendMessage(
                steamID,
                `Error getting price for ${name === null ? (params.sku as string) : name}: ${
                    thisErr.body && thisErr.body.message ? thisErr.body.message : thisErr.message
                }`
            );
            return;
        }

        if (!price) {
            return;
        }
        const currBuy = new Currencies(price.buy);
        const currSell = new Currencies(price.sell);

        this.bot.sendMessage(
            steamID,
            `🔎 ${name}:\n• Buy  : ${currBuy.toString()}\n• Sell : ${currSell.toString()}\n\nPrices.TF: https://prices.tf/items/${
                params.sku as string
            }`
        );
    }
};

interface ErrorRequest {
    body?: ErrorBody;
    message?: string;
}

interface ErrorBody {
    message: string;
}

interface getSalesData {
    success: boolean;
    sku: string;
    name: string;
    sales: Sales[];
}

interface Sales {
    id: string;
    steamid: string;
    automatic: boolean;
    attributes: Record<string, unknown>;
    intent: number;
    currencies: Currencies;
    time: number;
}

interface PriceCheckRequest {
    success: boolean;
    sku?: string;
    name?: string;
    message?: string;
}

interface GetPrices {
    success: boolean;
    sku?: string;
    name?: string;
    currency?: number | string;
    source?: string;
    time?: number;
    buy?: Currencies;
    sell?: Currencies;
    message?: string;
}
