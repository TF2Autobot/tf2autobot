import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';

import dayjs from 'dayjs';

import * as c from './functions/export';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import Cart from '../Carts/Cart';
import AdminCart from '../Carts/AdminCart';
import UserCart from '../Carts/UserCart';
import CartQueue from '../Carts/CartQueue';
import Autokeys from '../Autokeys/Autokeys';

import { fixItem } from '../../lib/items';
import { ignoreWords } from '../../lib/data';
import DonateCart from '../Carts/DonateCart';
import PremiumCart from '../Carts/PremiumCart';
import { getSkuAmountCanTrade } from '../Inventory';

export default class Commands {
    private readonly bot: Bot;

    readonly autokeys: Autokeys;

    private isDonating = false;

    constructor(bot: Bot) {
        this.bot = bot;
        this.autokeys = new Autokeys(bot);
    }

    get cartQueue(): CartQueue {
        return this.bot.handler.cartQueue;
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
            c.help.helpCommand(steamID, this.bot);
        } else if (command === 'how2trade') {
            c.help.howToTradeCommand(steamID, this.bot);
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
            this.cartCommand(steamID);
        } else if (command === 'clearcart') {
            this.clearCartCommand(steamID);
        } else if (command === 'checkout') {
            this.checkoutCommand(steamID);
        } else if (command === 'cancel') {
            this.cancelCommand(steamID);
        } else if (command === 'queue') {
            this.queueCommand(steamID);
        } else if (command === 'owner') {
            c.misc.ownerCommand(steamID, this.bot);
        } else if (command === 'discord') {
            c.misc.discordCommand(steamID, this.bot);
        } else if (command === 'more') {
            c.help.moreCommand(steamID, this.bot);
        } else if (command === 'autokeys') {
            c.manager.autoKeysCommand(steamID, this.bot, this.autokeys);
        } else if (command === 'message') {
            c.messageCommand(steamID, message, this.bot);
        } else if (command === 'time') {
            c.misc.timeCommand(steamID, this.bot);
        } else if (command === 'uptime') {
            c.misc.uptimeCommand(steamID, this.bot);
        } else if (command === 'pure') {
            c.misc.pureCommand(steamID, this.bot);
        } else if (command === 'rate') {
            c.misc.rateCommand(steamID, this.bot);
        } else if (command === 'stock') {
            c.misc.stockCommand(steamID, this.bot);
        } else if (command === 'craftweapon') {
            c.misc.craftweaponCommand(steamID, this.bot);
        } else if (command === 'uncraftweapon') {
            c.misc.uncraftweaponCommand(steamID, this.bot);
        } else if (command === 'sales' && isAdmin) {
            void c.request.getSalesCommand(steamID, message, this.bot);
        } else if (['deposit', 'd'].includes(command) && isAdmin) {
            this.depositCommand(steamID, message);
        } else if (['withdraw', 'w'].includes(command) && isAdmin) {
            this.withdrawCommand(steamID, message);
        } else if (command === 'add' && isAdmin) {
            c.pricelist.addCommand(steamID, message, this.bot);
        } else if (command === 'update' && isAdmin) {
            void c.pricelist.updateCommand(steamID, message, this.bot);
        } else if (command === 'remove' && isAdmin) {
            void c.pricelist.removeCommand(steamID, message, this.bot);
        } else if (command === 'get' && isAdmin) {
            c.pricelist.getCommand(steamID, message, this.bot);
        } else if (command === 'autoadd' && isAdmin) {
            void c.pricelist.autoAddCommand(steamID, message, this.bot);
        } else if (command === 'stopautoadd' && isAdmin) {
            void c.pricelist.stopAutoAddCommand();
        } else if (command === 'shuffle' && isAdmin) {
            void c.pricelist.shuffleCommand(steamID, this.bot);
        } else if (command === 'expand' && isAdmin) {
            c.manager.expandCommand(steamID, message, this.bot);
        } else if (command === 'delete' && isAdmin) {
            c.manager.deleteCommand(steamID, message, this.bot);
        } else if (command === 'use' && isAdmin) {
            c.manager.useCommand(steamID, message, this.bot);
        } else if (command === 'name' && isAdmin) {
            c.manager.nameCommand(steamID, message, this.bot);
        } else if (command === 'avatar' && isAdmin) {
            c.manager.avatarCommand(steamID, message, this.bot);
        } else if (command === 'unblock' && isAdmin) {
            c.manager.unblockCommand(steamID, message, this.bot);
        } else if (command === 'block' && isAdmin) {
            c.manager.blockCommand(steamID, message, this.bot);
        } else if (command === 'clearfriends' && isAdmin) {
            c.manager.clearFriendsCommand(steamID, this.bot);
        } else if (command === 'stop' && isAdmin) {
            c.manager.stopCommand(steamID, this.bot);
        } else if (command === 'restart' && isAdmin) {
            c.manager.restartCommand(steamID, this.bot);
        } else if (command === 'updaterepo' && isAdmin) {
            c.manager.updaterepoCommand(steamID, this.bot, message);
        } else if (command === 'refreshautokeys' && isAdmin) {
            c.manager.refreshAutokeysCommand(steamID, this.bot, this.autokeys);
        } else if (command === 'refreshlist' && isAdmin) {
            c.manager.refreshListingsCommand(steamID, this.bot);
        } else if (command === 'stats' && isAdmin) {
            c.botStatus.statsCommand(steamID, this.bot);
        } else if (command === 'statsdw' && isAdmin) {
            c.botStatus.statsDWCommand(steamID, this.bot);
        } else if (command === 'inventory' && isAdmin) {
            c.botStatus.inventoryCommand(steamID, this.bot);
        } else if (command === 'version' && isAdmin) {
            c.botStatus.versionCommand(steamID, this.bot);
        } else if (command === 'trades' && isAdmin) {
            c.review.tradesCommand(steamID, this.bot);
        } else if (command === 'trade' && isAdmin) {
            c.review.tradeCommand(steamID, message, this.bot);
        } else if (['accepttrade', 'accept'].includes(command) && isAdmin) {
            void c.review.accepttradeCommand(steamID, message, this.bot);
        } else if (['declinetrade', 'decline'].includes(command) && isAdmin) {
            void c.review.declinetradeCommand(steamID, message, this.bot);
        } else if (command === 'pricecheck' && isAdmin) {
            c.request.pricecheckCommand(steamID, message, this.bot);
        } else if (command === 'pricecheckall' && isAdmin) {
            void c.request.pricecheckAllCommand(steamID, this.bot);
        } else if (command === 'check' && isAdmin) {
            void c.request.checkCommand(steamID, message, this.bot);
        } else if (command === 'find' && isAdmin) {
            c.pricelist.findCommand(steamID, message, this.bot);
        } else if (command === 'options' && isAdmin) {
            c.options.optionsCommand(steamID, this.bot);
        } else if (command === 'config' && isAdmin) {
            c.options.updateOptionsCommand(steamID, message, this.bot);
        } else if (command === 'donatebptf' && isAdmin) {
            this.donateBPTFCommand(steamID, message);
        } else if (command === 'donatenow' && isAdmin) {
            this.donateNowCommand(steamID);
        } else if (command === 'donatecart' && isAdmin) {
            this.donateCartCommand(steamID);
        } else if (command === 'premium' && isAdmin) {
            this.buyBPTFPremiumCommand(steamID, message);
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
        const opt = this.bot.options.commands.price;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
                return;
            }
        }

        const info = c.utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot);

        if (info === null) {
            return;
        }

        const isAdmin = this.bot.isAdmin(steamID);

        const match = info.match;
        const amount = info.amount;

        let reply = '';

        const isBuying = match.intent === 0 || match.intent === 2;
        const isSelling = match.intent === 1 || match.intent === 2;

        const keyPrices = this.bot.pricelist.getKeyPrices;

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
                          match.buy.toValue(keyPrices.buy.metal) * amount,
                          isKey ? undefined : keyPrices.buy.metal
                      );

            reply += `${pluralize(match.name, 2)} for ${currencies.toString()}`;
        }

        if (isSelling) {
            const currencies =
                amount === 1
                    ? match.sell
                    : Currencies.toCurrencies(
                          match.sell.toValue(keyPrices.sell.metal) * amount,
                          isKey ? undefined : keyPrices.sell.metal
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

        reply += `.\n📦 I have ${this.bot.inventoryManager.getInventory.getAmount(match.sku, true)}`;

        if (match.max !== -1 && isBuying) {
            reply += ` / ${match.max}`;
        }

        if (isSelling && match.min !== 0) {
            reply += ` and I can sell ${this.bot.inventoryManager.amountCanTrade(match.sku, false, false, true)}`;
        }

        reply += '. ';

        if (match.autoprice && isAdmin) {
            reply += ` (price last updated ${dayjs.unix(match.time).fromNow()})`;
        }

        this.bot.sendMessage(steamID, reply);
    }

    // Instant item trade

    private buyCommand(steamID: SteamID, message: string): void {
        const opt = this.bot.options.commands.buy;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
                return;
            }
        }

        const info = c.utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, 'buy');

        if (info === null) {
            return;
        }

        const match = info.match;
        const amount = info.amount;

        const cart = new UserCart(steamID, this.bot);
        cart.setNotify = true;

        cart.addOurItem(match.sku, amount);

        this.addCartToQueue(cart, false, false);
    }

    private sellCommand(steamID: SteamID, message: string): void {
        const opt = this.bot.options.commands.sell;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
                return;
            }
        }

        const info = c.utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, 'sell');

        if (info === null) {
            return;
        }

        const match = info.match;
        const amount = info.amount;

        const cart = new UserCart(steamID, this.bot);
        cart.setNotify = true;

        cart.addTheirItem(match.sku, amount);

        this.addCartToQueue(cart, false, false);
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

        const opt = this.bot.options.commands.buycart;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
                return;
            }
        }

        const info = c.utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, 'buycart');

        if (info === null) {
            return;
        }

        const match = info.match;
        let amount = info.amount;

        const cart = Cart.getCart(steamID) || new UserCart(steamID, this.bot);

        const cartAmount = cart.getOurCount(match.sku);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(match.sku, true);
        const amountCanTrade = this.bot.inventoryManager.amountCanTrade(match.sku, false, false, true) - cartAmount;

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

        const opt = this.bot.options.commands.sellcart;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
                return;
            }
        }

        const info = c.utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, 'sellcart');

        if (info === null) {
            return;
        }

        const match = info.match;
        let amount = info.amount;

        const cart = Cart.getCart(steamID) || new UserCart(steamID, this.bot);

        const skuCount = getSkuAmountCanTrade(match.sku, this.bot);
        let cartAmount;
        if (skuCount.amountCanTrade >= skuCount.amountCanTradeGeneric) {
            cartAmount = cart.getTheirCount(match.sku);
        } else {
            cartAmount = cart.getTheirGenericCount(match.sku);
        }
        const amountCanTrade = skuCount.mostCanTrade - cartAmount;

        const name = skuCount.name;

        // Correct trade if needed
        if (amountCanTrade <= 0) {
            this.bot.sendMessage(
                steamID,
                'I ' +
                    (skuCount.mostCanTrade > 0 ? "can't buy" : "don't want") +
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

    private cartCommand(steamID: SteamID): void {
        const opt = this.bot.options.commands.cart;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
                return;
            }
        }

        if (this.isDonating) {
            this.bot.sendMessage(
                steamID,
                `You're about to send donation. Send "!donatecart" to view your donation cart summary or "!donatenow" to send donation now.`
            );
            return;
        }
        this.bot.sendMessage(steamID, Cart.stringify(steamID, false));
    }

    private clearCartCommand(steamID: SteamID): void {
        Cart.removeCart(steamID);

        const custom = this.bot.options.commands.clearcart.customReply.reply;

        this.bot.sendMessage(steamID, custom ? custom : '🛒 Your cart has been cleared.');
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

        const custom = this.bot.options.commands.checkout.customReply.empty;

        if (cart === null) {
            this.bot.sendMessage(steamID, custom ? custom : '🛒 Your cart is empty.');
            return;
        }

        cart.setNotify = true;

        cart.isDonating = false;

        this.addCartToQueue(cart, false, false);
    }

    // Trade actions

    private cancelCommand(steamID: SteamID): void {
        // Maybe have the cancel command only cancel the offer in the queue, and have a command for canceling the offer?

        const positionInQueue = this.cartQueue.getPosition(steamID);

        // If a user is in the queue, then they can't have an active offer

        const custom = this.bot.options.commands.cancel.customReply;

        if (positionInQueue === 0) {
            // The user is in the queue and the offer is already being processed
            const cart = this.cartQueue.getCart(steamID);

            if (cart.isMade) {
                this.bot.sendMessage(
                    steamID,
                    custom.isBeingSent
                        ? custom.isBeingSent
                        : '⚠️ Your offer is already being sent! Please try again when the offer is active.'
                );
                return;
            } else if (cart.isCanceled) {
                this.bot.sendMessage(
                    steamID,
                    custom.isCancelling
                        ? custom.isCancelling
                        : '⚠️ Your offer is already being canceled. Please wait a few seconds for it to be canceled.'
                );
                return;
            }

            cart.setCanceled = 'BY_USER';
        } else if (positionInQueue !== -1) {
            // The user is in the queue
            this.cartQueue.dequeue(steamID);
            this.bot.sendMessage(
                steamID,
                custom.isRemovedFromQueue ? custom.isRemovedFromQueue : '✅ You have been removed from the queue.'
            );
        } else {
            // User is not in the queue, check if they have an active offer

            const activeOffer = this.bot.trades.getActiveOffer(steamID);

            if (activeOffer === null) {
                this.bot.sendMessage(
                    steamID,
                    custom.noActiveOffer ? custom.noActiveOffer : "❌ You don't have an active offer."
                );
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

    private addCartToQueue(cart: Cart, isDonating: boolean, isBuyingPremium: boolean): void {
        const activeOfferID = this.bot.trades.getActiveOffer(cart.partner);

        const custom = this.bot.options.commands.addToQueue;

        if (activeOfferID !== null) {
            this.bot.sendMessage(
                cart.partner,
                custom.alreadyHaveActiveOffer
                    ? custom.alreadyHaveActiveOffer.replace(
                          /%tradeurl%/g,
                          `https://steamcommunity.com/tradeoffer/${activeOfferID}/`
                      )
                    : `❌ You already have an active offer! Please finish it before requesting a new one: https://steamcommunity.com/tradeoffer/${activeOfferID}/`
            );
            return;
        }

        const currentPosition = this.cartQueue.getPosition(cart.partner);

        if (currentPosition !== -1) {
            if (currentPosition === 0) {
                this.bot.sendMessage(
                    cart.partner,
                    custom.alreadyInQueueProcessingOffer
                        ? custom.alreadyInQueueProcessingOffer
                        : '⚠️ You are already in the queue! Please wait while I process your offer.'
                );
            } else {
                this.bot.sendMessage(
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
            return;
        }

        const position = this.cartQueue.enqueue(cart, isDonating, isBuyingPremium);

        if (position !== 0) {
            this.bot.sendMessage(
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

    private queueCommand(steamID: SteamID): void {
        const position = this.bot.handler.cartQueue.getPosition(steamID);
        const custom = this.bot.options.commands.queue.customReply;

        if (position === -1) {
            this.bot.sendMessage(steamID, custom.notInQueue ? custom.notInQueue : '❌ You are not in the queue.');
        } else if (position === 0) {
            this.bot.sendMessage(
                steamID,
                custom.offerBeingMade ? custom.offerBeingMade : '⌛ Your offer is being made.'
            );
        } else {
            this.bot.sendMessage(
                steamID,
                custom.hasPosition
                    ? custom.hasPosition.replace(/%position%/g, String(position))
                    : `There are ${position} users ahead of you.`
            );
        }
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

        message = c.utils.removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (params.sku === undefined) {
            const item = c.utils.getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        const sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        const amount = typeof params.amount === 'number' ? params.amount : 1;

        if (!Number.isInteger(amount)) {
            this.bot.sendMessage(steamID, `❌ amount should only be an integer.`);
            return;
        }

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

        message = c.utils.removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (params.sku === undefined) {
            const item = c.utils.getItemFromParams(steamID, params, this.bot);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        const sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        let amount = typeof params.amount === 'number' ? params.amount : 1;

        if (!Number.isInteger(amount)) {
            this.bot.sendMessage(steamID, `❌ amount should only be an integer.`);
            return;
        }

        const cart = AdminCart.getCart(steamID) || new AdminCart(steamID, this.bot);

        const cartAmount = cart.getOurCount(sku);
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(sku, true);
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

        message = c.utils.removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (params.sku === undefined) {
            const item = c.utils.getItemFromParams(steamID, params, this.bot);

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
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(sku, true);
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

        cart.setNotify = true;

        cart.isDonating = true;

        this.addCartToQueue(cart, true, false);
    }

    private donateCartCommand(steamID: SteamID): void {
        if (!this.isDonating) {
            this.bot.sendMessage(
                steamID,
                `You're currently not donating to backpack.tf. If a cart already been created, cancel it with "!clearcart"`
            );
            return;
        }
        this.bot.sendMessage(steamID, Cart.stringify(steamID, true));
    }

    private buyBPTFPremiumCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof PremiumCart)) {
            this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one.'
            );
            return;
        }

        message = c.utils.removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (
            params.months === undefined ||
            typeof params.months !== 'number' ||
            !Number.isInteger(params.months) ||
            params.months < 1
        ) {
            this.bot.sendMessage(
                steamID,
                '❌ Wrong syntax. Example: !premium months=1' +
                    '\n\n📌 Note: 📌\n- 1 month = 3 keys\n- 2 months = 5 keys\n- 3 months = 8 keys\n- 4 months = 10 keys\n- 1 year (12 months) = 30 keys'
            );
            return;
        }

        const amountMonths = params.months;
        const numMonths = params.months;
        const numOdds = numMonths % 2 !== 0 ? (numMonths - 1) / 2 + 1 : (numMonths - 1) / 2;
        const numEvens = numMonths - numOdds;
        const amountKeys = Math.round(numOdds * 3 + numEvens * 2);

        const ourAmount = this.bot.inventoryManager.getInventory.getAmount('5021;6', true);

        if (ourAmount < amountKeys) {
            this.bot.sendMessage(
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
            return;
        }

        if (params.i_am_sure !== 'yes_i_am') {
            this.bot.sendMessage(
                steamID,
                `⚠️ Are you sure that you want to buy premium for ${pluralize('month', amountMonths, true)}?` +
                    `\nThis will cost you ${pluralize('key', amountKeys, true)}.` +
                    `\nIf yes, retry by sending !premium months=${amountMonths}&i_am_sure=yes_i_am`
            );
            return;
        }

        const cart = new PremiumCart(steamID, this.bot);

        cart.addOurItem('5021;6', amountKeys);

        Cart.addCart(cart);

        cart.setNotify = true;

        cart.isBuyingPremium = true;

        this.addCartToQueue(cart, false, true);
    }
}
