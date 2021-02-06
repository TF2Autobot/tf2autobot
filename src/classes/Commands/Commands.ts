import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Currencies from 'tf2-currencies';
import dayjs from 'dayjs';

import * as c from './functions/export';

import Bot from '../Bot';
import CommandParser from '../CommandParser';
import { getSkuAmountCanTrade } from '../Inventory';
import Cart from '../Carts/Cart';
import AdminCart from '../Carts/AdminCart';
import UserCart from '../Carts/UserCart';
import DonateCart from '../Carts/DonateCart';
import PremiumCart from '../Carts/PremiumCart';
import CartQueue from '../Carts/CartQueue';

import { fixItem } from '../../lib/items';

type Instant = 'buy' | 'b' | 'sell' | 's';
type CraftUncraft = 'craftweapon' | 'uncraftweapon';
type Misc = 'time' | 'uptime' | 'pure' | 'rate' | 'owner' | 'discord' | 'stock';
type BlockUnblock = 'block' | 'unblock';
type NameAvatar = 'name' | 'avatar';
type TF2GC = 'expand' | 'use' | 'delete';
type ActionOnTrade = 'accept' | 'accepttrade' | 'decline' | 'declinetrade';

export default class Commands {
    private readonly bot: Bot;

    private isDonating = false;

    constructor(bot: Bot) {
        this.bot = bot;
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

    processMessage(steamID: SteamID, message: string): void {
        const command = CommandParser.getCommand(message.toLowerCase());
        const isAdmin = this.bot.isAdmin(steamID);

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
            c.help.helpCommand(steamID, this.bot);
        } else if (command === 'how2trade') {
            c.help.howToTradeCommand(steamID, this.bot);
        } else if (['price', 'pc'].includes(command)) {
            this.priceCommand(steamID, message);
        } else if (['buy', 'b', 'sell', 's'].includes(command)) {
            this.buyOrSellCommand(steamID, message, command as Instant);
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
        } else if (['time', 'uptime', 'pure', 'rate', 'owner', 'discord', 'stock'].includes(command)) {
            c.misc.miscCommand(steamID, this.bot, command as Misc);
        } else if (command === 'paints' && isAdmin) {
            c.misc.paintsCommand(steamID, this.bot);
        } else if (command === 'more') {
            c.help.moreCommand(steamID, this.bot);
        } else if (command === 'autokeys') {
            c.manager.autokeysCommand(steamID, this.bot);
        } else if (command === 'message') {
            c.messageCommand(steamID, message, this.bot);
        } else if (['craftweapon', 'uncraftweapon'].includes(command)) {
            c.misc.weaponCommand(steamID, this.bot, command as CraftUncraft);
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
            c.pricelist.stopAutoAddCommand();
        } else if (command === 'shuffle' && isAdmin) {
            void c.pricelist.shuffleCommand(steamID, this.bot);
        } else if (['expand', 'delete', 'use'].includes(command) && isAdmin) {
            c.manager.TF2GCCommand(steamID, message, this.bot, command as TF2GC);
        } else if (['name', 'avatar'].includes(command) && isAdmin) {
            c.manager.nameAvatarCommand(steamID, message, this.bot, command as NameAvatar);
        } else if (['block', 'unblock'].includes(command) && isAdmin) {
            c.manager.blockUnblockCommand(steamID, message, this.bot, command as BlockUnblock);
        } else if (command === 'clearfriends' && isAdmin) {
            void c.manager.clearFriendsCommand(steamID, this.bot);
        } else if (command === 'stop' && isAdmin) {
            c.manager.stopCommand(steamID, this.bot);
        } else if (command === 'restart' && isAdmin) {
            c.manager.restartCommand(steamID, this.bot);
        } else if (command === 'updaterepo' && isAdmin) {
            void c.manager.updaterepoCommand(steamID, this.bot, message);
        } else if (command === 'refreshautokeys' && isAdmin) {
            c.manager.refreshAutokeysCommand(steamID, this.bot);
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
        } else if (['accepttrade', 'accept', 'declinetrade', 'decline'].includes(command) && isAdmin) {
            void c.review.actionOnTradeCommand(steamID, message, this.bot, command as ActionOnTrade);
        } else if (command === 'pricecheck' && isAdmin) {
            c.request.pricecheckCommand(steamID, message, this.bot);
        } else if (command === 'pricecheckall' && isAdmin) {
            void c.request.pricecheckAllCommand(steamID, this.bot);
        } else if (command === 'check' && isAdmin) {
            void c.request.checkCommand(steamID, message, this.bot);
        } else if (command === 'find' && isAdmin) {
            void c.pricelist.findCommand(steamID, message, this.bot);
        } else if (command === 'options' && isAdmin) {
            void c.options.optionsCommand(steamID, this.bot);
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
        } else if (
            ignoreWords.startsWith.some(word => message.startsWith(word)) ||
            ignoreWords.endsWith.some(word => message.endsWith(word))
        ) {
            return;
        } else {
            const custom = this.bot.options.customMessage.iDontKnowWhatYouMean;
            this.bot.sendMessage(
                steamID,
                custom ? custom : '❌ I don\'t know what you mean, please type "!help" for all of my commands!'
            );
        }
    }

    private priceCommand(steamID: SteamID, message: string): void {
        const opt = this.bot.options.commands.price;

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = c.utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot);
        if (info === null) {
            return;
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

        reply += `.\n📦 I have ${this.bot.inventoryManager.getInventory.getAmount(match.sku, true)}`;

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

        this.bot.sendMessage(steamID, reply);
    }

    // Instant item trade

    private buyOrSellCommand(steamID: SteamID, message: string, command: Instant): void {
        const opt = this.bot.options.commands[command === 'b' ? 'buy' : command === 's' ? 'sell' : command];

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = c.utils.getItemAndAmount(
            steamID,
            CommandParser.removeCommand(message),
            this.bot,
            command === 'b' ? 'buy' : command === 's' ? 'sell' : command
        );

        if (info === null) {
            return;
        }

        const cart = new UserCart(
            steamID,
            this.bot,
            this.weaponsAsCurrency.enable ? this.bot.craftWeapons : [],
            this.weaponsAsCurrency.enable && this.weaponsAsCurrency.withUncraft ? this.bot.uncraftWeapons : []
        );

        cart.setNotify = true;
        cart[['b', 'buy'].includes(command) ? 'addOurItem' : 'addTheirItem'](info.match.sku, info.amount);

        this.addCartToQueue(cart, false, false);
    }

    // Multiple items trade

    private buyCartCommand(steamID: SteamID, message: string): void {
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
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = c.utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, 'buycart');

        if (info === null) {
            return;
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
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(info.match.sku, true);
        const amountCanTrade = this.bot.inventoryManager.amountCanTrade(info.match.sku, false) - cartAmount;

        const name = this.bot.schema.getName(SKU.fromString(info.match.sku), false);

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
                    ' been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        } else
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(name, Math.abs(amount), true)}` +
                    ' has been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );

        cart.addOurItem(info.match.sku, amount);
        Cart.addCart(cart);
    }

    private sellCartCommand(steamID: SteamID, message: string): void {
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

        const info = c.utils.getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, 'sellcart');
        if (info === null) {
            return;
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

            this.bot.sendMessage(
                steamID,
                `I can only buy ${pluralize(skuCount.name, amount, true)}. ` +
                    (amount > 1 ? 'They have' : 'It has') +
                    ' been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        } else {
            this.bot.sendMessage(
                steamID,
                `✅ ${pluralize(skuCount.name, Math.abs(amount), true)}` +
                    ' has been added to your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
            );
        }

        cart.addTheirItem(info.match.sku, amount);
        Cart.addCart(cart);
    }

    private cartCommand(steamID: SteamID): void {
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
        this.bot.sendMessage(steamID, Cart.stringify(steamID, false));
    }

    private clearCartCommand(steamID: SteamID): void {
        Cart.removeCart(steamID);
        const custom = this.bot.options.commands.clearcart.customReply.reply;
        this.bot.sendMessage(steamID, custom ? custom : '🛒 Your cart has been cleared.');
    }

    private checkoutCommand(steamID: SteamID): void {
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
            this.bot.sendMessage(
                steamID,
                custom.isRemovedFromQueue ? custom.isRemovedFromQueue : '✅ You have been removed from the queue.'
            );
        } else {
            // User is not in the queue, check if they have an active offer

            const activeOffer = this.bot.trades.getActiveOffer(steamID);

            if (activeOffer === null) {
                return this.bot.sendMessage(
                    steamID,
                    custom.noActiveOffer ? custom.noActiveOffer : "❌ You don't have an active offer."
                );
            }

            void this.bot.trades.getOffer(activeOffer).asCallback((err, offer) => {
                if (err || !offer) {
                    return this.bot.sendMessage(
                        steamID,
                        `❌ Ohh nooooes! Something went wrong while trying to get the offer: ${JSON.stringify(err)}` +
                            (!offer ? ` (or the offer might already be canceled)` : '')
                    );
                }

                offer.data('canceledByUser', true);

                offer.cancel(err => {
                    // Only react to error, if the offer is canceled then the user
                    // will get an alert from the onTradeOfferChanged handler

                    if (err) {
                        this.bot.sendMessage(
                            steamID,
                            `❌ Ohh nooooes! Something went wrong while trying to cancel the offer: ${err.message}`
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
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(c.utils.removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const item = c.utils.getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return this.bot.sendMessage(steamID, `❌ Item not found.`);
            }

            params.sku = SKU.fromObject(item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

        const amount = typeof params.amount === 'number' ? params.amount : 1;
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
        cart.addTheirItem(params.sku, amount);
        Cart.addCart(cart);

        this.bot.sendMessage(
            steamID,
            `✅ ${pluralize(
                this.bot.schema.getName(SKU.fromString(params.sku), false),
                Math.abs(amount),
                true
            )} has been ` +
                (amount >= 0 ? 'added to' : 'removed from') +
                ' your cart. Type "!cart" to view your cart summary or "!checkout" to checkout. 🛒'
        );
    }

    private withdrawCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof AdminCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one. 🛒'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(c.utils.removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const item = c.utils.getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return this.bot.sendMessage(steamID, `❌ Item not found.`);
            }

            params.sku = SKU.fromObject(item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku as string), this.bot.schema));
        }

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
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(params.sku, true);
        const amountCanTrade = ourAmount - cartAmount;
        const name = this.bot.schema.getName(SKU.fromString(params.sku), false);

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
                return this.bot.sendMessage(
                    steamID,
                    `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
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

        cart.addOurItem(params.sku, amount);
        Cart.addCart(cart);
    }

    private donateBPTFCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);

        if (currentCart !== null && !(currentCart instanceof DonateCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one.'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(c.utils.removeLinkProtocol(message)));
        if (params.sku === undefined) {
            const item = c.utils.getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return this.bot.sendMessage(steamID, `❌ Item not found.`);
            }

            params.sku = SKU.fromObject(item);
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
        const ourAmount = this.bot.inventoryManager.getInventory.getAmount(params.sku, true);
        const amountCanTrade = ourAmount - cart.getOurCount(params.sku) - cartAmount;

        const name = this.bot.schema.getName(SKU.fromString(params.sku), false);

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
                return this.bot.sendMessage(
                    steamID,
                    `❌ I don't have any ${(ourAmount > 0 ? 'more ' : '') + pluralize(name, 0)}.`
                );
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

        cart.addOurItem(params.sku, amount);
        Cart.addCart(cart);
    }

    private donateNowCommand(steamID: SteamID): void {
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

        this.addCartToQueue(cart, true, false);
    }

    private donateCartCommand(steamID: SteamID): void {
        if (!this.isDonating) {
            return this.bot.sendMessage(
                steamID,
                `You're currently not donating to backpack.tf. If a cart already been created, cancel it with "!clearcart"`
            );
        }
        this.bot.sendMessage(steamID, Cart.stringify(steamID, true));
    }

    private buyBPTFPremiumCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof PremiumCart)) {
            return this.bot.sendMessage(
                steamID,
                '❌ You already have an active cart, please finalize it before making a new one.'
            );
        }

        const params = CommandParser.parseParams(CommandParser.removeCommand(c.utils.removeLinkProtocol(message)));
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

        const ourAmount = this.bot.inventoryManager.getInventory.getAmount('5021;6', true);

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
            return this.bot.sendMessage(
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

        this.addCartToQueue(cart, false, true);
    }
}
