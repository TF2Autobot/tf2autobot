import SteamID from 'steamid';
import SKU from 'tf2-sku';
import pluralize from 'pluralize';
import moment from 'moment-timezone';
import Currencies from 'tf2-currencies';
import validUrl from 'valid-url';
import TradeOfferManager from 'steam-tradeoffer-manager';

import Bot from './Bot';
import CommandParser from './CommandParser';
import { Entry, EntryData } from './Pricelist';
import Cart from './Cart';
import AdminCart from './AdminCart';
import UserCart from './UserCart';
import MyHandler from './MyHandler';
import CartQueue from './CartQueue';
import DiscordWebhookClass from './DiscordWebhook';
import sleepasync from 'sleep-async';

import { Item, Currency } from '../types/TeamFortress2';
import { UnknownDictionaryKnownValues, UnknownDictionary } from '../types/common';
import { fixItem } from '../lib/items';
import { requestCheck, getPrice, getSales } from '../lib/ptf-api';
import validator from '../lib/validator';
import log from '../lib/logger';
import SchemaManager from 'tf2-schema';
import Autokeys from './Autokeys';

const COMMANDS: string[] = [
    '!help - Get a list of commands',
    '!how2trade - Guide on how to trade with the bot',
    '!price [amount] <name> - Get the price and stock of an item 💲📦\n\n✨=== Instant item trade ===✨',
    '!buy [amount] <name> - Instantly buy an item 💲',
    '!sell [amount] <name> - Instantly sell an item 💲\n\n✨=== Multiple items trade ===✨',
    '!buycart [amount] <name> - Add an item you want to buy to your cart 🛒',
    '!sellcart [amount] <name> - Add an item you want to sell to your cart 🛒',
    '!cart - See your cart 🛒',
    '!clearcart - Clear your cart ❎🛒',
    '!checkout - Have the bot send an offer for the items in your cart ✅🛒\n\n✨=== Trade actions ===✨',
    '!cancel - Cancel the trade offer ❌',
    '!queue - See your position in the queue\n\n✨=== Contact Owner ===✨',
    '!owner - Get the owner Steam profile and Backpack.tf links',
    '!message <your message> - Send a message to the owner of the bot 💬',
    '!discord - Get a link to join TF2Autobot and/or the owner discord server\n\n✨=== Other Commands ===✨',
    '!more - Show the advanced commands list'
];

const MORE: string[] = [
    "!autokeys - Get info on the bot's current autokeys settings 🔑",
    "!time - Show the owner's current time 🕥",
    '!uptime - Show the bot uptime 🔌',
    "!pure - Get the bot's current pure stock 💰",
    "!rate - Get the bot's current key rates 🔑",
    '!stock - Get a list of items that the bot owns',
    "!craftweapon - Get a list of the bot's craftable weapon stock 🔫",
    "!uncraftweapon - Get a list of the bot's uncraftable weapon stock 🔫",
    '!sales <name=item name> OR <sku=item sku> - Get the sales history for an item'
];

const ADMIN_COMMANDS: string[] = [
    '!deposit <name=>&<amount=> - Deposit items',
    '!withdraw <name=>&<amount=> - Withdraw items\n\n✨=== Pricelist manager ===✨',
    '!add <sku=> OR <item=> - Add a pricelist entry ➕',
    '!update <sku=> OR <item=> - Update a pricelist entry',
    '!remove <sku=> OR <item=> - Remove a pricelist entry ➖',
    '!get <sku=> OR <item=> - Get raw information about a pricelist entry\n\n✨=== Bot manager ===✨',
    "!expand <craftable=true|false> - Use Backpack Expanders to increase your bot's inventory limit",
    "!delete sku=<item sku> OR assetid=<item assetid> - Delete any item from your bot's inventory (use only sku) 🚮",
    '!message <steamid> <your message> - Send a message to a specific user 💬',
    '!block <steamid> - Block a specific user',
    '!unblock <steamid> - Unblock a specific user',
    '!stop - Stop your bot 🔴',
    '!restart - Restart your bot 🔄',
    '!refreshautokeys - Refresh your autokeys settings.',
    '!refreshlist - Refresh sell listings 🔄',
    "!name <new_name> - Change your bot's name",
    "!avatar <image_URL> - Change your bot's avatar",
    '!resetqueue - Reset queue position to 0\n\n✨=== Bot status ===✨',
    '!stats - Get statistics for accepted trades 📊',
    "!inventory - Get your bot's current inventory spaces 🎒",
    '!version - Get the version that your bot is running\n\n✨=== Manual review ===✨',
    '!trades - Get a list of trade offers pending for manual review 🔍',
    '!trade <offerID> - Get information about a trade',
    '!accept <offerID> [Your Message] - Manually accept an active offer ✅🔍',
    '!decline <offerID> [Your Message] - Manually decline an active offer ❌🔍\n\n✨=== Request ===✨',
    '!check <sku=> OR <item=> - Request the current price for an item from Prices.TF',
    '!pricecheck <sku=> OR <item=> - Request an item to be price checked by Prices.TF',
    "!pricecheckall - Request all items in your bot's inventory to be price checked by Prices.TF\n\n✨=== Misc ===✨",
    "!autokeys - Get info on the bot's current autokeys settings 🔑",
    "!time - Show the owner's current time 🕥",
    '!uptime - Show the bot uptime 🔌',
    "!pure - Get the bot's current pure stock 💰",
    "!rate - Get the bot's current key rates 🔑",
    '!stock - Get a list of items that the bot owns',
    "!craftweapon - Get a list of the bot's craftable weapon stock 🔫",
    "!uncraftweapon - Get a list of the bot's uncraftable weapon stock 🔫",
    '!sales <name=item name> OR <sku=item sku> - Get the sales history for an item 🔍',
    '!find <parameters> - Get the list of filtered items detail based on the parameters 🔍'
];

export = class Commands {
    private readonly bot: Bot;

    readonly discord: DiscordWebhookClass;

    readonly autokeys: Autokeys;

    private first30Minutes = true;

    private first30MinutesTimeout;

    private executed: boolean;

    private lastExecutedTime: number | null = null;

    private executeTimeout;

    constructor(bot: Bot) {
        this.bot = bot;
        this.discord = new DiscordWebhookClass(bot);
        this.autokeys = new Autokeys(bot);

        this.first30MinutesTimeout = setTimeout(() => {
            this.first30Minutes = false;
            clearTimeout(this.first30MinutesTimeout);
        }, 30 * 60 * 1000);
    }

    get cartQueue(): CartQueue {
        return (this.bot.getHandler() as MyHandler).cartQueue;
    }

    processMessage(steamID: SteamID, message: string): void {
        const command = CommandParser.getCommand(message);

        const isAdmin = this.bot.isAdmin(steamID);

        const isNoReply =
            this.messageInputsStartWith().some(word => {
                return message.startsWith(word);
            }) ||
            this.messageInputEndsWith().some(word => {
                return message.endsWith(word);
            });

        if (command === 'help') {
            this.helpCommand(steamID);
        } else if (command === 'how2trade') {
            this.howToTradeCommand(steamID);
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
            this.ownerCommand(steamID);
        } else if (command === 'discord') {
            this.discordCommand(steamID);
        } else if (command === 'more') {
            this.moreCommand(steamID);
        } else if (command === 'autokeys') {
            this.autoKeysCommand(steamID);
        } else if (command === 'message') {
            this.messageCommand(steamID, message);
        } else if (command === 'time') {
            this.timeCommand(steamID);
        } else if (command === 'uptime') {
            this.uptimeCommand(steamID);
        } else if (command === 'pure') {
            this.pureCommand(steamID);
        } else if (command === 'rate') {
            this.rateCommand(steamID);
        } else if (command === 'stock') {
            this.stockCommand(steamID);
        } else if (command === 'craftweapon') {
            this.craftweaponCommand(steamID);
        } else if (command === 'uncraftweapon') {
            this.uncraftweaponCommand(steamID);
        } else if (command === 'sales') {
            this.getSalesCommand(steamID, message);
        } else if (['deposit', 'd'].includes(command) && isAdmin) {
            this.depositCommand(steamID, message);
        } else if (['withdraw', 'w'].includes(command) && isAdmin) {
            this.withdrawCommand(steamID, message);
        } else if (command === 'add' && isAdmin) {
            this.addCommand(steamID, message);
        } else if (command === 'update' && isAdmin) {
            this.updateCommand(steamID, message);
        } else if (command === 'remove' && isAdmin) {
            this.removeCommand(steamID, message);
        } else if (command === 'get' && isAdmin) {
            this.getCommand(steamID, message);
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
            this.statsCommand(steamID);
        } else if (command === 'inventory' && isAdmin) {
            this.inventoryCommand(steamID);
        } else if (command === 'version' && isAdmin) {
            this.versionCommand(steamID);
        } else if (command === 'trades' && isAdmin) {
            this.tradesCommand(steamID);
        } else if (command === 'trade' && isAdmin) {
            this.tradeCommand(steamID, message);
        } else if (['accepttrade', 'accept'].includes(command) && isAdmin) {
            this.accepttradeCommand(steamID, message);
        } else if (['declinetrade', 'decline'].includes(command) && isAdmin) {
            this.declinetradeCommand(steamID, message);
        } else if (command === 'pricecheck' && isAdmin) {
            this.pricecheckCommand(steamID, message);
        } else if (command === 'pricecheckall' && isAdmin) {
            this.pricecheckAllCommand(steamID);
        } else if (command === 'check' && isAdmin) {
            this.checkCommand(steamID, message);
        } else if (command === 'find' && isAdmin) {
            this.findCommand(steamID, message);
        } else if (isNoReply) {
            return null;
        } else {
            this.bot.sendMessage(
                steamID,
                process.env.CUSTOM_I_DONT_KNOW_WHAT_YOU_MEAN
                    ? process.env.CUSTOM_I_DONT_KNOW_WHAT_YOU_MEAN
                    : '❌ I don\'t know what you mean, please type "!help" for all my commands!'
            );
        }
    }

    private helpCommand(steamID: SteamID): void {
        const isAdmin = this.bot.isAdmin(steamID);
        this.bot.sendMessage(
            steamID,
            `📜 Here's a list of my commands:\n- ${isAdmin ? ADMIN_COMMANDS.join('\n- ') : COMMANDS.join('\n- ')}`
        );
    }

    private moreCommand(steamID: SteamID): void {
        this.bot.sendMessage(steamID, `Advanced commands list:\n- ${MORE.join('\n- ')}`);
    }

    private howToTradeCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            process.env.CUSTOM_HOW2TRADE_MESSAGE
                ? process.env.CUSTOM_HOW2TRADE_MESSAGE
                : '/quote You can either send me an offer yourself, or use one of my commands to request a trade. Say you want to buy a Team Captain, just type "!buy Team Captain", if want to buy more, just add the [amount] - "!buy 2 Team Captain". Type "!help" for all the commands.' +
                      '\nYou can also buy or sell multiple items by using "!buycart [amount] <item name>" or "!sellcart [amount] <item name>" commands.'
        );
    }

    private ownerCommand(steamID: SteamID): void {
        if (process.env.DISABLE_OWNER_COMMAND === 'true') {
            this.bot.sendMessage(steamID, '❌ This command is disabled by the owner.');
            return;
        }
        const admins = this.bot.getAdmins();
        const firstAdmin = admins[0];

        this.bot.sendMessage(
            steamID,
            `• Steam: https://steamcommunity.com/profiles/${firstAdmin.toString()}` +
                `\n• Backpack.tf: https://backpack.tf/profiles/${firstAdmin.toString()}`
        );
    }

    private discordCommand(steamID: SteamID): void {
        let reply = '';
        if (process.env.DISCORD_SERVER_INVITE_LINK) {
            reply += `TF2Autobot Discord Server: https://discord.gg/ZrVT7mc\nOwner's Discord Server: ${process.env.DISCORD_SERVER_INVITE_LINK}`;
        } else {
            reply += 'TF2Autobot Discord Server: https://discord.gg/ZrVT7mc';
        }

        this.bot.sendMessage(steamID, reply);
    }

    private priceCommand(steamID: SteamID, message: string): void {
        const info = this.getItemAndAmount(steamID, CommandParser.removeCommand(message));

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
                reply += amount + ' ';
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
                    reply += amount + ' ';
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
        const info = this.getItemAndAmount(steamID, CommandParser.removeCommand(message));

        if (info === null) {
            return;
        }

        const match = info.match;
        const amount = info.amount;

        const cart = new UserCart(steamID, this.bot);
        cart.setNotify(true);

        cart.addOurItem(match.sku, amount);

        this.addCartToQueue(cart);
    }

    private sellCommand(steamID: SteamID, message: string): void {
        const info = this.getItemAndAmount(steamID, CommandParser.removeCommand(message));

        if (info === null) {
            return;
        }

        const match = info.match;
        const amount = info.amount;

        const cart = new UserCart(steamID, this.bot);
        cart.setNotify(true);

        cart.addTheirItem(match.sku, amount);

        this.addCartToQueue(cart);
    }

    // Multiple items trade

    private buyCartCommand(steamID: SteamID, message: string): void {
        const currentCart = Cart.getCart(steamID);
        if (currentCart !== null && !(currentCart instanceof UserCart)) {
            this.bot.sendMessage(
                steamID,
                '❌ You already have a different cart open, finish it before making a new one. 🛒'
            );
            return;
        }

        const info = this.getItemAndAmount(steamID, CommandParser.removeCommand(message));

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
                '❌ You already have a different cart open, finish it before making a new one. 🛒'
            );
            return;
        }

        const info = this.getItemAndAmount(steamID, CommandParser.removeCommand(message));

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
                this.bot.sendMessage(steamID, `I don't want any more ${pluralize(name, 0)}.`);
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
        this.bot.sendMessage(steamID, Cart.stringify(steamID));
    }

    private clearCartCommand(steamID: SteamID): void {
        Cart.removeCart(steamID);

        this.bot.sendMessage(steamID, '🛒 Your cart has been cleared.');
    }

    private checkoutCommand(steamID: SteamID): void {
        const cart = Cart.getCart(steamID);

        if (cart === null) {
            this.bot.sendMessage(steamID, '🛒 Your cart is empty.');
            return;
        }

        cart.setNotify(true);

        this.addCartToQueue(cart);
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

            this.bot.trades.getOffer(activeOffer).asCallback((err, offer) => {
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

    private addCartToQueue(cart: Cart): void {
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

        const position = this.cartQueue.enqueue(cart);

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
            this.bot.sendMessage(steamID, `There is ${position} infront of you.`);
        }
    }

    // under !more command

    private messageCommand(steamID: SteamID, message: string): void {
        const isAdmin = this.bot.isAdmin(steamID);

        if (process.env.DISABLE_MESSAGES === 'true') {
            if (isAdmin) {
                this.bot.sendMessage(
                    steamID,
                    '❌ The message command is disabled. Enable it in the config with `DISABLE_MESSAGES=false`.'
                );
            } else {
                this.bot.sendMessage(steamID, '❌ The owner has disabled messages.');
            }
            return;
        }

        const adminDetails = this.bot.friends.getFriend(steamID);

        if (isAdmin) {
            const parts = message.split(' ');
            const steamIdAndMessage = CommandParser.removeCommand(message);
            // Use regex
            const steamIDreg = new RegExp(
                /(\d+)|(STEAM_([0-5]):([0-1]):([0-9]+))|(\[([a-zA-Z]):([0-5]):([0-9]+)(:[0-9]+)?\])/
            );

            let steamIDString: string;

            if (!steamIDreg.test(steamIdAndMessage) || !steamIDreg || parts.length < 3) {
                this.bot.sendMessage(
                    steamID,
                    '❌ Your syntax is wrong or wrong SteamID. Here\'s an example: "!message 76561198120070906 Hi"' +
                        "\n\nHow to get the targeted user's SteamID?" +
                        '\n1. Go to his/her profile page.' +
                        '\n2. Go to https://steamrep.com/' +
                        '\n2. Watch this gif image: https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif'
                );
                return;
            } else {
                steamIDString = steamIDreg.exec(steamIdAndMessage)[0];
            }

            const recipient = steamIDString;
            const recipientSteamID = new SteamID(recipient);

            if (!recipientSteamID.isValid()) {
                this.bot.sendMessage(
                    steamID,
                    `❌ "${recipient}" is not a valid steamID.` +
                        "\n\nHow to get the targeted user's SteamID?" +
                        '\n1. Go to his/her profile page.' +
                        '\n2. Go to https://steamrep.com/' +
                        '\n2. Watch this gif image: https://user-images.githubusercontent.com/47635037/96715154-be80b580-13d5-11eb-9bd5-39613f600f6d.gif'
                );
                return;
            }

            const recipentDetails = this.bot.friends.getFriend(recipientSteamID);

            const reply = steamIdAndMessage.substr(steamIDString.length);

            // Send message to recipient
            this.bot.sendMessage(recipient, `/quote 💬 Message from owner: ${reply}`);

            // Send confirmation message to admin
            this.bot.sendMessage(steamID, '✅ Your message has been sent.');

            // Send message to all other admins that an admin replied
            this.bot.messageAdmins(
                (adminDetails ? adminDetails.player_name + ` (${steamID})` : steamID) +
                    ' sent a message to ' +
                    (recipentDetails ? recipentDetails.player_name + ` (${recipientSteamID})` : recipientSteamID) +
                    ` with "${reply}".`,
                [steamID]
            );
            return;
        } else {
            const admins = this.bot.getAdmins();
            if (!admins || admins.length === 0) {
                // Just default to same message as if it was disabled
                this.bot.sendMessage(steamID, '❌ The owner has disabled messages.');
                return;
            }

            const msg = message.substr(message.toLowerCase().indexOf('message') + 8);
            if (!msg) {
                this.bot.sendMessage(steamID, '❌ Please include a message. Here\'s an example: "!message Hi"');
                return;
            }

            const links = (this.bot.handler as MyHandler).tradePartnerLinks(steamID.toString());
            const time = (this.bot.handler as MyHandler).timeWithEmoji();

            if (
                process.env.DISABLE_DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER === 'false' &&
                process.env.DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_URL
            ) {
                this.discord.sendPartnerMessage(
                    steamID.toString(),
                    msg,
                    adminDetails.player_name,
                    adminDetails.avatar_url_full,
                    links.steamProfile,
                    links.backpackTF,
                    links.steamREP,
                    time.time
                );
            } else {
                this.bot.messageAdmins(
                    `/quote 💬 You've got a message from #${steamID} (${adminDetails.player_name}):` +
                        `"${msg}". ` +
                        `\nSteam: ${links.steamProfile}` +
                        `\nBackpack.tf: ${links.backpackTF}` +
                        `\nSteamREP: ${links.steamREP}`,
                    []
                );
            }
            this.bot.sendMessage(steamID, '✅ Your message has been sent.');
        }
    }

    private timeCommand(steamID: SteamID): void {
        const timeWithEmojis = (this.bot.handler as MyHandler).timeWithEmoji();
        this.bot.sendMessage(
            steamID,
            `My owner time is currently at ${timeWithEmojis.emoji} ${timeWithEmojis.time +
                (timeWithEmojis.note !== '' ? `. ${timeWithEmojis.note}.` : '.')}`
        );
    }

    private uptimeCommand(steamID: SteamID): void {
        const uptime = (this.bot.handler as MyHandler).getUptime();

        const now = moment().valueOf();
        const diffTime = now - uptime;

        const printTime =
            diffTime >= 77400 * 1000 && diffTime < 127800 * 1000 // 21.5 h - 35.5 hours will show "a day", so show hours in bracket.
                ? ' (' + Math.round((diffTime / 3600) * 1000) + ' hours)'
                : diffTime >= 2203200 * 1000 // More than 25.5 days, will become "a month", so show how many days in bracket.
                ? ' (' + Math.round((diffTime / 86400) * 1000) + ' days)'
                : '';

        this.bot.sendMessage(steamID, `Bot has been up for ${moment(uptime).fromNow(true) + printTime}.`);
    }

    private pureCommand(steamID: SteamID): void {
        const pureStock = (this.bot.handler as MyHandler).pureStock();

        this.bot.sendMessage(steamID, `💰 I have ${pureStock.join(' and ')} in my inventory.`);
    }

    private rateCommand(steamID: SteamID): void {
        const keyPrice = this.bot.pricelist.getKeyPrice().toString();

        this.bot.sendMessage(
            steamID,
            'I value 🔑 Mann Co. Supply Crate Keys at ' +
                keyPrice +
                '. This means that one key is the same as ' +
                keyPrice +
                ', and ' +
                keyPrice +
                ' is the same as one key.'
        );
    }

    private stockCommand(steamID: SteamID): void {
        const dict = this.bot.inventoryManager.getInventory().getItems();

        const items: { amount: number; name: string }[] = [];

        for (const sku in dict) {
            if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
                continue;
            }

            if (['5021;6', '5002;6', '5001;6', '5000;6'].includes(sku)) {
                continue;
            }

            items.push({
                name: this.bot.schema.getName(SKU.fromString(sku), false),
                amount: dict[sku].length
            });
        }

        items.sort(function(a, b) {
            if (a.amount === b.amount) {
                if (a.name < b.name) {
                    return -1;
                } else if (a.name > b.name) {
                    return 1;
                } else {
                    return 0;
                }
            }
            return b.amount - a.amount;
        });

        const pure = [
            {
                name: 'Mann Co. Supply Crate Key',
                amount: this.bot.inventoryManager.getInventory().getAmount('5021;6')
            },
            {
                name: 'Refined Metal',
                amount: this.bot.inventoryManager.getInventory().getAmount('5002;6')
            },
            {
                name: 'Reclaimed Metal',
                amount: this.bot.inventoryManager.getInventory().getAmount('5001;6')
            },
            {
                name: 'Scrap Metal',
                amount: this.bot.inventoryManager.getInventory().getAmount('5000;6')
            }
        ];

        const parsed = pure.concat(items);

        const stock: string[] = [];
        let left = 0;

        for (let i = 0; i < parsed.length; i++) {
            if (stock.length > 20) {
                left += parsed[i].amount;
            } else {
                stock.push(parsed[i].name + ': ' + parsed[i].amount);
            }
        }

        let reply = `/pre 📜 Here's a list of all the items that I have in my inventory:\n${stock.join(', \n')}`;
        if (left > 0) {
            reply += `,\nand ${left} other ${pluralize('item', left)}`;
        }

        this.bot.sendMessage(steamID, reply);
    }

    private craftweaponCommand(steamID: SteamID): void {
        const crafWeaponStock = this.craftWeapons();

        let reply: string;
        if (crafWeaponStock.length > 0) {
            reply = "📃 Here's a list of all craft weapons stock in my inventory:\n\n" + crafWeaponStock.join(', \n');
        } else {
            reply = "❌ I don't have any craftable weapons in my inventory.";
        }
        this.bot.sendMessage(steamID, reply);
    }

    private uncraftweaponCommand(steamID: SteamID): void {
        const uncrafWeaponStock = this.uncraftWeapons();

        let reply: string;
        if (uncrafWeaponStock.length > 0) {
            reply =
                "📃 Here's a list of all uncraft weapons stock in my inventory:\n\n" + uncrafWeaponStock.join(', \n');
        } else {
            reply = "❌ I don't have any uncraftable weapons in my inventory.";
        }
        this.bot.sendMessage(steamID, reply);
    }

    private async getSalesCommand(steamID: SteamID, message: string): Promise<void> {
        message = removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), this.bot.schema));
        const item = SKU.fromString(params.sku);
        const name = this.bot.schema.getName(item);

        let salesData;

        try {
            salesData = await getSales(params.sku, 'bptf');
        } catch (err) {
            this.bot.sendMessage(
                steamID,
                `❌ Error getting sell snapshots for ${name === null ? params.sku : name}: ${
                    err.body && err.body.message ? err.body.message : err.message
                }`
            );
            return;
        }

        if (!salesData) {
            this.bot.sendMessage(steamID, `❌ No recorded snapshots found for ${name === null ? params.sku : name}.`);
            return;
        }

        if (salesData.sales.length === 0) {
            this.bot.sendMessage(steamID, `❌ No recorded snapshots found for ${name === null ? params.sku : name}.`);
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

        sales.sort(function(a, b) {
            return b.date - a.date;
        });

        let left = 0;
        const SalesList: string[] = [];

        for (let i = 0; i < sales.length; i++) {
            if (SalesList.length > 40) {
                left += 1;
            } else {
                SalesList.push(
                    `Listed #${i + 1}-----` +
                        '\n• Date: ' +
                        moment
                            .unix(sales[i].date)
                            .utc()
                            .toString() +
                        '\n• Item: ' +
                        sales[i].itemHistory +
                        '\n• Seller: ' +
                        sales[i].seller +
                        '\n• Was selling for: ' +
                        (sales[i].keys > 0 ? sales[i].keys + ' keys, ' : '') +
                        sales[i].metal +
                        ' ref'
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
                '❌ You already have a different cart open, finish it before making a new one. 🛒'
            );
            return;
        }

        message = removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

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
                '❌ You already have a different cart open, finish it before making a new one. 🛒'
            );
            return;
        }

        message = removeLinkProtocol(message);
        const paramStr = CommandParser.removeCommand(message);

        const params = CommandParser.parseParams(paramStr);

        if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

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

    // Pricelist manager

    private addCommand(steamID: SteamID, message: string): void {
        message = removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message)) as any;

        if (params.enabled === undefined) {
            params.enabled = true;
        }
        if (params.max === undefined) {
            params.max = 1;
        }
        if (params.min === undefined) {
            params.min = 0;
        }
        if (params.intent === undefined) {
            params.intent = 2;
        } else if (typeof params.intent === 'string') {
            const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());
            if (intent !== -1) {
                params.intent = intent;
            }
        }

        if (typeof params.buy === 'object') {
            params.buy.keys = params.buy.keys || 0;
            params.buy.metal = params.buy.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }
        }
        if (typeof params.sell === 'object') {
            params.sell.keys = params.sell.keys || 0;
            params.sell.metal = params.sell.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }
        }

        if (params.autoprice === undefined) {
            params.autoprice = true;
        }

        if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        this.bot.pricelist
            .addPrice(params as EntryData, true)
            .then(entry => {
                this.bot.sendMessage(steamID, `✅ Added "${entry.name}".`);
            })
            .catch(err => {
                this.bot.sendMessage(steamID, `❌ Failed to add the item to the pricelist: ${err.message}`);
            });
    }

    private updateCommand(steamID: SteamID, message: string): void {
        message = removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (typeof params.intent === 'string') {
            const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());
            if (intent !== -1) {
                params.intent = intent;
            }
        }

        if (params.all === true) {
            // TODO: Must have atleast one other param
            const pricelist = this.bot.pricelist.getPrices();

            if (pricelist.length === 0) {
                this.bot.sendMessage(steamID, 'Your pricelist is empty.');
                return;
            }

            for (let i = 0; i < pricelist.length; i++) {
                if (params.intent) {
                    pricelist[i].intent = params.intent as 0 | 1 | 2;
                }

                if (params.min && typeof params.min === 'number') {
                    pricelist[i].min = params.min;
                }

                if (params.max && typeof params.max === 'number') {
                    pricelist[i].max = params.max;
                }

                if (params.enabled === false || params.enabled === true) {
                    pricelist[i].enabled = params.enabled;
                }

                if (params.autoprice === false) {
                    pricelist[i].time = null;
                    pricelist[i].autoprice = false;
                } else if (params.autoprice === true) {
                    pricelist[i].time = 0;
                    pricelist[i].autoprice = true;
                }

                if (i === 0) {
                    const errors = validator(
                        {
                            sku: pricelist[i].sku,
                            enabled: pricelist[i].enabled,
                            intent: pricelist[i].intent,
                            max: pricelist[i].max,
                            min: pricelist[i].min,
                            autoprice: pricelist[i].autoprice,
                            buy: pricelist[i].buy.toJSON(),
                            sell: pricelist[i].sell.toJSON(),
                            time: pricelist[i].time
                        },
                        'pricelist'
                    );

                    if (errors !== null) {
                        throw new Error(errors.join(', '));
                    }
                }
            }

            // FIXME: Make it so that it is not needed to remove all listings

            if (params.autoprice !== true) {
                this.bot.getHandler().onPricelist(pricelist);
                this.bot.sendMessage(steamID, '✅ Updated pricelist!');
                this.bot.listings.redoListings().asCallback();
                return;
            }

            this.bot.sendMessage(steamID, '⌛ Updating prices...');

            this.bot.pricelist
                .setupPricelist()
                .then(() => {
                    this.bot.sendMessage(steamID, '✅ Updated pricelist!');
                    this.bot.listings.redoListings().asCallback();
                })
                .catch(err => {
                    log.warn('Failed to update prices: ', err);
                    this.bot.sendMessage(steamID, `❌ Failed to update prices: ${err.message}`);
                    return;
                });
            return;
        }

        if (typeof params.buy === 'object' && params.buy !== null) {
            params.buy.keys = params.buy.keys || 0;
            params.buy.metal = params.buy.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }
        }
        if (typeof params.sell === 'object' && params.sell !== null) {
            params.sell.keys = params.sell.keys || 0;
            params.sell.metal = params.sell.metal || 0;

            if (params.autoprice === undefined) {
                params.autoprice = false;
            }
        }

        if (params.item !== undefined) {
            // Remove by full name
            let match = this.bot.pricelist.searchByName(params.item as string, false);

            if (match === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ I could not find any items in my pricelist that contains "${params.item}"`
                );
                return;
            } else if (Array.isArray(match)) {
                const matchCount = match.length;
                if (match.length > 20) {
                    match = match.splice(0, 20);
                }

                let reply = `I've found ${match.length} items. Try with one of the items shown below:\n${match.join(
                    ',\n'
                )}`;
                if (matchCount > match.length) {
                    const other = matchCount - match.length;
                    reply += `,\nand ${other} other ${pluralize('item', other)}.`;
                }

                this.bot.sendMessage(steamID, reply);
                return;
            }

            delete params.item;
            params.sku = match.sku;
        } else if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        if (!this.bot.pricelist.hasPrice(params.sku as string)) {
            this.bot.sendMessage(steamID, '❌ Item is not in the pricelist.');
            return;
        }

        const entryData = this.bot.pricelist.getPrice(params.sku as string, false).getJSON();

        delete entryData.time;
        delete params.sku;

        if (Object.keys(params).length === 0) {
            this.bot.sendMessage(steamID, '⚠️ Missing properties to update.');
            return;
        }

        // Update entry
        for (const property in params) {
            if (!Object.prototype.hasOwnProperty.call(params, property)) {
                continue;
            }

            entryData[property] = params[property];
        }

        this.bot.pricelist
            .updatePrice(entryData, true)
            .then(entry => {
                this.bot.sendMessage(steamID, `✅ Updated "${entry.name}".`);
            })
            .catch(err => {
                this.bot.sendMessage(
                    steamID,
                    '❌ Failed to update pricelist entry: ' +
                        (err.body && err.body.message ? err.body.message : err.message)
                );
            });
    }

    private removeCommand(steamID: SteamID, message: string): void {
        message = removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.all === true) {
            // Remove entire pricelist
            const pricelistLength = this.bot.pricelist.getLength();

            if (pricelistLength === 0) {
                this.bot.sendMessage(steamID, '❌ Your pricelist is already empty!');
                return;
            }

            if (params.i_am_sure !== 'yes_i_am') {
                this.bot.sendMessage(
                    steamID,
                    '/pre ⚠️ Are you sure that you want to remove ' +
                        pluralize('item', pricelistLength, true) +
                        '? Try again with i_am_sure=yes_i_am'
                );
                return;
            }

            this.bot.pricelist
                .removeAll()
                .then(() => {
                    this.bot.sendMessage(steamID, '✅ Cleared pricelist!');
                })
                .catch(err => {
                    this.bot.sendMessage(steamID, `❌ Failed to clear pricelist: ${err.message}`);
                });
            return;
        }

        if (params.item !== undefined) {
            // Remove by full name
            let match = this.bot.pricelist.searchByName(params.item as string, false);

            if (match === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ I could not find any items in my pricelist that contains "${params.item}"`
                );
                return;
            } else if (Array.isArray(match)) {
                const matchCount = match.length;
                if (match.length > 20) {
                    match = match.splice(0, 20);
                }

                let reply = `I've found ${match.length} items. Try with one of the items shown below:\n${match.join(
                    ',\n'
                )}`;
                if (matchCount > match.length) {
                    const other = matchCount - match.length;
                    reply += `,\nand ${other} other ${pluralize('item', other)}.`;
                }

                this.bot.sendMessage(steamID, reply);
                return;
            }

            delete params.item;
            params.sku = match.sku;
        } else if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        this.bot.pricelist
            .removePrice(params.sku as string, true)
            .then(entry => {
                this.bot.sendMessage(steamID, `✅ Removed "${entry.name}".`);
            })
            .catch(err => {
                this.bot.sendMessage(steamID, `❌ Failed to remove pricelist entry: ${err.message}`);
            });
    }

    private getCommand(steamID: SteamID, message: string): void {
        message = removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.item !== undefined) {
            // Remove by full name
            let match = this.bot.pricelist.searchByName(params.item as string, false);

            if (match === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ I could not find any items in my pricelist that contains "${params.item}"`
                );
                return;
            } else if (Array.isArray(match)) {
                const matchCount = match.length;
                if (match.length > 20) {
                    match = match.splice(0, 20);
                }

                let reply = `I've found ${match.length} items. Try with one of the items shown below:\n${match.join(
                    ',\n'
                )}`;
                if (matchCount > match.length) {
                    const other = matchCount - match.length;
                    reply += `,\nand ${other} other ${pluralize('item', other)}.`;
                }

                this.bot.sendMessage(steamID, reply);
                return;
            }

            delete params.item;
            params.sku = match.sku;
        } else if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        if (params.sku === undefined) {
            this.bot.sendMessage(steamID, '❌ Missing item');
            return;
        }

        const match = this.bot.pricelist.getPrice(params.sku as string);

        if (match === null) {
            this.bot.sendMessage(steamID, `❌ Could not find item "${params.sku}" in the pricelist`);
        } else {
            this.bot.sendMessage(steamID, `/code ${JSON.stringify(match, null, 4)}`);
        }
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

        if (params.assetid !== undefined && params.sku === undefined) {
            // This most likely not working with Non-Tradable items.
            const ourInventory = this.bot.inventoryManager.getInventory();
            const sku = ourInventory.findByAssetid(params.assetid);

            if (sku === null) {
                this.bot.tf2gc.deleteItem(params.assetid, err => {
                    if (err) {
                        log.warn(`Error trying to delete ${params.assetid}: `, err);
                        this.bot.sendMessage(steamID, `❌ Failed to delete ${params.assetid}: ${err.message}`);
                        return;
                    }
                    this.bot.sendMessage(steamID, `✅ Deleted ${params.assetid}!`);
                });
                return;
            } else {
                const item = SKU.fromString(sku);
                const name = this.bot.schema.getName(item, false);

                this.bot.tf2gc.deleteItem(params.assetid, err => {
                    if (err) {
                        log.warn(`Error trying to delete ${name}: `, err);
                        this.bot.sendMessage(steamID, `❌ Failed to delete ${name}(${params.assetid}): ${err.message}`);
                        return;
                    }
                    this.bot.sendMessage(steamID, `✅ Deleted ${name}(${params.assetid})!`);
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

        const uncraft = params.sku.includes(';uncraftable');
        const untrade = params.sku.includes(';untradable');

        params.sku = params.sku.replace(';uncraftable', '');
        params.sku = params.sku.replace(';untradable', '');
        const item = SKU.fromString(params.sku);

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
            if (assetids.includes(params.assetid)) {
                assetid = params.assetid;
            } else {
                this.bot.sendMessage(
                    steamID,
                    `❌ Looks like an assetid ${params.assetid} did not matched with any assetids associated with ${name}(${params.sku}) in my inventory. Try only with sku to delete a random assetid.`
                );
                return;
            }
        } else {
            assetid = assetids[0];
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
                this.bot.sendMessage(steamID, `❌ Error while uploading new avatar: ${err.message}`);
                return;
            }

            this.bot.sendMessage(steamID, '✅ Successfully uploaded new avatar.');
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

        this.bot.client.blockUser(targetSteamID64, function(err) {
            if (err) {
                log.warn(`Failed to block user ${targetSteamID64}: `, err);
                sendMessage.sendMessage(steamID, `❌ Failed to block user ${targetSteamID64}: ${err}`);
                return;
            }
            sendMessage.sendMessage(steamID, `✅ Successfully blocked user ${targetSteamID64}`);
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

        this.bot.client.unblockUser(targetSteamID64, function(err) {
            if (err) {
                log.warn(`Failed to unblock user ${targetSteamID64}: `, err);
                sendMessage.sendMessage(steamID, `❌ Failed to unblock user ${targetSteamID64}: ${err}`);
                return;
            }
            sendMessage.sendMessage(steamID, `✅ Successfully unblocked user ${targetSteamID64}`);
        });
    }

    private stopCommand(steamID: SteamID): void {
        this.bot.sendMessage(steamID, '⌛ Stopping...');

        this.bot.botManager.stopProcess().catch(err => {
            log.warn('Error occurred while trying to stop: ', err);
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
            .catch(err => {
                log.warn('Error occurred while trying to restart: ', err);
                this.bot.sendMessage(steamID, `❌ An error occurred while trying to restart: ${err.message}`);
            });
    }

    private refreshAutokeysCommand(steamID: SteamID): void {
        if (this.autokeys.isEnabled === false) {
            this.bot.sendMessage(steamID, `This feature is disabled.`);
            return;
        }

        this.autokeys.refresh();
        this.bot.sendMessage(steamID, '✅ Successfully refreshed Autokeys.');
    }

    private relistCommand(steamID: SteamID): void {
        if (this.first30Minutes) {
            this.bot.sendMessage(steamID, `❌ I am just started... Please wait until the first 30 minutes has ended.`);
            return;
        }

        const newExecutedTime = moment().valueOf();
        const timeDiff = newExecutedTime - this.lastExecutedTime;

        if (this.executed === true) {
            this.bot.sendMessage(
                steamID,
                '⚠️ You need to wait ' +
                    Math.trunc((30 * 60 * 1000 - timeDiff) / (1000 * 60)) +
                    ' minutes before you can relist again.'
            );
            return;
        } else {
            clearTimeout(this.executeTimeout);
            this.lastExecutedTime = moment().valueOf();

            this.bot.listings.redoListingsWithDelay();
            this.bot.sendMessage(steamID, `✅ Relisting executed.`);

            this.executed = true;
            this.executeTimeout = setTimeout(() => {
                this.lastExecutedTime = null;
                this.executed = false;
                clearTimeout(this.executeTimeout);
            }, 30 * 60 * 1000);
        }
    }

    private resetQueueCommand(steamID: SteamID): void {
        this.cartQueue.resetQueue();
        this.bot.sendMessage(steamID, '✅ Sucessfully reset queue!');
    }

    private findCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (
            !(
                params.enabled !== undefined ||
                params.max !== undefined ||
                params.min !== undefined ||
                params.intent !== undefined ||
                params.autoprice !== undefined
            )
        ) {
            this.bot.sendMessage(
                steamID,
                '⚠️ Only parameters: enabled, max, min, intent, autoprice\nExample: !find intent=sell'
            );
            return;
        }

        const pricelist = this.bot.pricelist.getPrices();
        let filter = pricelist;

        if (params.enabled !== undefined && typeof params.enabled === 'boolean') {
            filter = filter.filter(entry => entry.enabled === params.enabled);
        } else if (params.enabled !== undefined && typeof params.enabled !== 'boolean') {
            this.bot.sendMessage(steamID, '⚠️ enabled parameter must be either true or false only');
            return;
        }

        if (params.max !== undefined && typeof params.max === 'number') {
            filter = filter.filter(entry => entry.max === params.max);
        } else if (params.max !== undefined && typeof params.max !== 'number') {
            this.bot.sendMessage(steamID, '⚠️ max parameter must be an integer only');
            return;
        }

        if (params.min !== undefined && typeof params.min === 'number') {
            filter = filter.filter(entry => entry.min === params.min);
        } else if (params.min !== undefined && typeof params.min !== 'number') {
            this.bot.sendMessage(steamID, '⚠️ min parameter must be an integer only');
            return;
        }

        if (params.intent !== undefined && typeof params.intent === 'number') {
            filter = filter.filter(entry => entry.intent === params.intent);
        } else if (typeof params.intent === 'string') {
            const intent = ['buy', 'sell', 'bank'].indexOf(params.intent.toLowerCase());
            if (intent !== -1) {
                params.intent = intent;
                filter = filter.filter(entry => entry.intent === params.intent);
            }
        } else if (
            params.intent !== undefined &&
            (typeof params.intent !== 'number' || typeof params.intent !== 'string')
        ) {
            this.bot.sendMessage(
                steamID,
                '⚠️ intent parameter must be a word of "buy", "sell", or "bank" OR an integer of "0", "1" or "2" only'
            );
            return;
        }

        if (params.autoprice !== undefined && typeof params.autoprice === 'boolean') {
            filter = filter.filter(entry => entry.autoprice === params.autoprice);
        } else if (params.autoprice !== undefined && typeof params.autoprice !== 'boolean') {
            this.bot.sendMessage(steamID, '⚠️ autoprice parameter must be either true or false only');
            return;
        }

        const parametersUsed = {
            enabled: params.enabled !== undefined ? 'enabled=' + params.enabled.toString() : '',
            autoprice: params.autoprice !== undefined ? 'autoprice=' + params.autoprice.toString() : '',
            max: params.max !== undefined ? 'max=' + params.max.toString() : '',
            min: params.min !== undefined ? 'min=' + params.min.toString() : '',
            intent: params.intent !== undefined ? 'intent=' + params.intent.toString() : ''
        };

        const parameters = Object.values(parametersUsed);
        log.debug(JSON.stringify(parameters));
        const display = parameters.filter(param => param !== '');

        const length = filter.length;

        if (length === 0) {
            this.bot.sendMessage(steamID, `No items found with ${display.join('&')}.`);
        } else if (length > 20) {
            this.bot.sendMessage(
                steamID,
                `Found ${pluralize('item', length, true)} with ${display.join('&')}, showing only max 100 items`
            );
            this.bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(0, 20), null, 4)}`);
            if (length <= 40) {
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(filter.slice(20, length > 40 ? 40 : length), null, 4)}`
                );
            } else if (length <= 60) {
                this.bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(20, 40), null, 4)}`);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(filter.slice(40, length > 60 ? 60 : length), null, 4)}`
                );
            } else if (length <= 80) {
                this.bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(20, 40), null, 4)}`);
                this.bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(40, 60), null, 4)}`);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(filter.slice(60, length > 80 ? 80 : length), null, 4)}`
                );
            } else if (length > 80) {
                this.bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(20, 40), null, 4)}`);
                this.bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(40, 60), null, 4)}`);
                this.bot.sendMessage(steamID, `/code ${JSON.stringify(filter.slice(60, 80), null, 4)}`);
                this.bot.sendMessage(
                    steamID,
                    `/code ${JSON.stringify(filter.slice(80, length > 100 ? 100 : length), null, 4)}`
                );
            }
        } else {
            this.bot.sendMessage(steamID, `Found ${pluralize('item', filter.length, true)} with ${display.join('&')}`);
            this.bot.sendMessage(steamID, `/code ${JSON.stringify(filter, null, 4)}`);
        }
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
            this.bot.listings.recursiveCheckPricelistWithDelay(pricelist).asCallback(() => {
                log.debug('Done checking ' + pluralize('item', pricelist.length, true));
                this.bot.sendMessage(steamID, '✅ Done refresh ' + pluralize('item', pricelist.length, true));
            });
        } else {
            this.bot.sendMessage(steamID, '❌ Nothing to refresh.');
        }
    }

    // Bot status

    private statsCommand(steamID: SteamID): void {
        const tradesFromEnv = parseInt(process.env.LAST_TOTAL_TRADES);
        const trades = (this.bot.handler as MyHandler).polldata();

        this.bot.sendMessage(
            steamID,
            'All trades are recorded from ' +
                pluralize('day', trades.totalDays, true) +
                ' ago 📊\n\n Total: ' +
                (tradesFromEnv !== 0 ? tradesFromEnv + trades.tradesTotal : trades.tradesTotal) +
                ' \n Last 24 hours: ' +
                trades.trades24Hours +
                ' \n Since beginning of today: ' +
                trades.tradesToday
        );
    }

    private inventoryCommand(steamID: SteamID): void {
        const currentItems = this.bot.inventoryManager.getInventory().getTotalItems();
        const backpackSlots = (this.bot.handler as MyHandler).getBackpackSlots();

        this.bot.sendMessage(
            steamID,
            `🎒 My current items in my inventory: ${currentItems + (backpackSlots !== 0 ? '/' + backpackSlots : '')}`
        );
    }

    private versionCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            `Currently running TF2Autobot@v${process.env.BOT_VERSION}. Checking for a new version...`
        );

        this.bot
            .checkForUpdates()
            .then(({ hasNewVersion, latestVersion }) => {
                if (!hasNewVersion) {
                    this.bot.sendMessage(steamID, 'You are running the latest version of TF2Autobot!');
                } else if (this.bot.lastNotifiedVersion === latestVersion) {
                    this.bot.sendMessage(
                        steamID,
                        `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.\n\nRelease note: https://github.com/idinium96/tf2autobot/releases` +
                            `\n\nNavigate to your bot folder and run [git checkout master && git reset HEAD --hard && git pull && npm install && npm run build] and then restart your bot.` +
                            `\nIf the update required you to update ecosystem.json, please make sure to restart your bot with [pm2 restart ecosystem.json --update-env] command.` +
                            '\nContact IdiNium if you have any other problem. Thank you.'
                    );
                }
            })
            .catch(err => {
                this.bot.sendMessage(steamID, `❌ Failed to check for updates: ${err.message}`);
            });
    }

    private autoKeysCommand(steamID: SteamID): void {
        if (this.autokeys.isEnabled === false) {
            this.bot.sendMessage(steamID, `This feature is disabled.`);
            return;
        }

        const autokeys = this.autokeys;

        const pure = (this.bot.handler as MyHandler).currPure();
        const currKey = pure.key;
        const currRef = pure.refTotalInScrap;

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
        reply += `\n       Key price: ${keyPrices.buy.metal + '/' + keyPrices.sell}`;
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
                      ) +
                      ' ref' +
                      (autokeys.isEnableScrapAdjustment ? ' (+' + autokeys.scrapAdjustmentValue + ' scrap)' : '')
                    : 'Selling for ' +
                      Currencies.toRefined(
                          keyPrices.sell.toValue() -
                              (autokeys.isEnableScrapAdjustment ? autokeys.scrapAdjustmentValue : 0)
                      ) +
                      ' ref' +
                      (autokeys.isEnableScrapAdjustment ? ' (-' + autokeys.scrapAdjustmentValue + ' scrap)' : '')
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

    // Manual review commands

    private tradesCommand(steamID: SteamID): void {
        // Go through polldata and find active offers

        const pollData = this.bot.manager.pollData;

        const offers: UnknownDictionaryKnownValues[] = [];

        for (const id in pollData.received) {
            if (!Object.prototype.hasOwnProperty.call(pollData.received, id)) {
                continue;
            }

            if (pollData.received[id] !== TradeOfferManager.ETradeOfferState.Active) {
                continue;
            }

            const data = pollData?.offerData[id] || null;

            if (data === null) {
                continue;
            } else if (data?.action?.action !== 'skip') {
                continue;
            }

            offers.push({ id: id, data: data });
        }

        if (offers.length === 0) {
            this.bot.sendMessage(steamID, '❌ There are no active offers pending for review.');
            return;
        }

        offers.sort((a, b) => a.id - b.id);

        let reply = `There is ${offers.length} active ${pluralize('offer', offers.length)} that you can review:`;

        for (let i = 0; i < offers.length; i++) {
            const offer = offers[i];

            reply +=
                `\n- Offer #${offer.id} from ${offer.data.partner} (reason: ${offer.data.action.meta.uniqueReasons.join(
                    ', '
                )})` + `\n⚠️ Send "!trade ${offer.id}" for more details.\n`;
        }

        this.bot.sendMessage(steamID, reply);
    }

    private tradeCommand(steamID: SteamID, message: string): void {
        const offerId = CommandParser.removeCommand(message).trim();

        if (offerId === '') {
            this.bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!trade 3957959294"');
            return;
        }

        const state = this.bot.manager.pollData.received[offerId];

        if (state === undefined) {
            this.bot.sendMessage(steamID, 'Offer does not exist. ❌');
            return;
        }

        if (state !== TradeOfferManager.ETradeOfferState.Active) {
            // TODO: Add what the offer is now, accepted / declined and why
            this.bot.sendMessage(steamID, 'Offer is not active. ❌');
            return;
        }

        const offerData = this.bot.manager.pollData.offerData[offerId];

        if (offerData?.action?.action !== 'skip') {
            this.bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
            return;
        }

        // Log offer details

        // TODO: Create static class for trade offer related functions?

        let reply =
            `⚠️ Offer #${offerId} from ${offerData.partner} is pending for review. ` +
            `\nReason: ${offerData.action.meta.uniqueReasons.join(', ')}). Summary:\n\n`;

        const keyPrice = this.bot.pricelist.getKeyPrices();
        const value: { our: Currency; their: Currency } = offerData.value;

        const items: {
            our: UnknownDictionary<number>;
            their: UnknownDictionary<number>;
        } = offerData.dict || { our: null, their: null };

        if (!value) {
            reply +=
                'Asked: ' +
                summarizeItems(items.our, this.bot.schema) +
                '\nOffered: ' +
                summarizeItems(items.their, this.bot.schema);
        } else {
            const valueDiff =
                new Currencies(value.their).toValue(keyPrice.sell.metal) -
                new Currencies(value.our).toValue(keyPrice.sell.metal);
            const valueDiffRef = Currencies.toRefined(Currencies.toScrap(Math.abs(valueDiff * (1 / 9)))).toString();
            reply +=
                'Asked: ' +
                new Currencies(value.our).toString() +
                ' (' +
                summarizeItems(items.our, this.bot.schema) +
                ')\nOffered: ' +
                new Currencies(value.their).toString() +
                ' (' +
                summarizeItems(items.their, this.bot.schema) +
                (valueDiff > 0
                    ? `)\n📈 Profit from overpay: ${valueDiffRef} ref`
                    : valueDiff < 0
                    ? `)\n📉 Loss from underpay: ${valueDiffRef} ref`
                    : ')');
        }

        const links = (this.bot.handler as MyHandler).tradePartnerLinks(offerData.partner.toString());
        reply +=
            `\n\nSteam: ${links.steamProfile}\nBackpack.tf: ${links.backpackTF}\nSteamREP: ${links.steamREP}` +
            `\n\n⚠️ Send "!accept ${offerId}" to accept or "!decline ${offerId}" to decline this offer.`;

        this.bot.sendMessage(steamID, reply);
    }

    private accepttradeCommand(steamID: SteamID, message: string): void {
        const offerIdAndMessage = CommandParser.removeCommand(message);
        const offerId = new RegExp(/\d+/).exec(offerIdAndMessage)[0];

        if (isNaN(+offerId) || !offerId) {
            this.bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!accept 3957959294"');
            return;
        }

        const state = this.bot.manager.pollData.received[offerId];

        if (state === undefined) {
            this.bot.sendMessage(steamID, 'Offer does not exist. ❌');
            return;
        }

        if (state !== TradeOfferManager.ETradeOfferState.Active) {
            // TODO: Add what the offer is now, accepted / declined and why
            this.bot.sendMessage(steamID, 'Offer is not active. ❌');
            return;
        }

        const offerData = this.bot.manager.pollData.offerData[offerId];

        if (offerData?.action.action !== 'skip') {
            this.bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
            return;
        }

        this.bot.trades.getOffer(offerId).asCallback((err, offer) => {
            if (err) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Ohh nooooes! Something went wrong while trying to accept the offer: ${err.message}`
                );
                return;
            }

            this.bot.sendMessage(steamID, 'Accepting offer...');

            const partnerId = new SteamID(this.bot.manager.pollData.offerData[offerId].partner);
            const reply = offerIdAndMessage.substr(offerId.length);
            const adminDetails = this.bot.friends.getFriend(steamID);

            let declineTrade = false;
            let hasNot5Uses = false;
            let hasNot25Uses = false;

            if (
                process.env.DISABLE_CHECK_USES_DUELING_MINI_GAME !== 'true' ||
                process.env.DISABLE_CHECK_USES_NOISE_MAKER !== 'true'
            ) {
                // Re-check for Dueling Mini-Game and/or Noise Maker for 5x/25x Uses only when enabled and exist in pricelist
                log.debug('Running re-check on Dueling Mini-Game and/or Noise maker...');

                const checkExist = this.bot.pricelist;

                offer.itemsToReceive.forEach(item => {
                    const isDuelingMiniGame = item.market_hash_name === 'Dueling Mini-Game';
                    const isNoiseMaker = (this.bot.handler as MyHandler).noiseMakerNames().some(name => {
                        return item.market_hash_name.includes(name);
                    });
                    if (isDuelingMiniGame && process.env.DISABLE_CHECK_USES_DUELING_MINI_GAME !== 'true') {
                        // Check for Dueling Mini-Game for 5x Uses only when enabled and exist in pricelist
                        for (let i = 0; i < item.descriptions.length; i++) {
                            const descriptionValue = item.descriptions[i].value;
                            const descriptionColor = item.descriptions[i].color;

                            if (
                                !descriptionValue.includes('This is a limited use item. Uses: 5') &&
                                descriptionColor === '00a000'
                            ) {
                                // Contains non-5x uses.
                                hasNot5Uses = true;
                                log.debug('info', `Dueling Mini-Game (${item.assetid}) is not 5 uses (re-checked).`);
                                break;
                            }
                        }
                    } else if (isNoiseMaker && process.env.DISABLE_CHECK_USES_NOISE_MAKER !== 'true') {
                        // Check for Noise Maker for 25x Uses only when enabled and exist in pricelist
                        for (let i = 0; i < item.descriptions.length; i++) {
                            const descriptionValue = item.descriptions[i].value;
                            const descriptionColor = item.descriptions[i].color;

                            if (
                                !descriptionValue.includes('This is a limited use item. Uses: 25') &&
                                descriptionColor === '00a000'
                            ) {
                                // Contains non-25x uses.
                                hasNot25Uses = true;
                                log.debug(
                                    'info',
                                    `${item.market_hash_name} (${item.assetid}) is not 25 uses (re-checked).`
                                );
                                break;
                            }
                        }
                    }
                });

                if (hasNot5Uses && checkExist.getPrice('241;6', true) !== null) {
                    // Only decline if exist in pricelist
                    offer.log('info', 'contains Dueling Mini-Game that are not 5 uses (re-checked).');
                    declineTrade = true;
                }

                const isNoiseMaker = (this.bot.handler as MyHandler).noiseMakerSKUs().some(sku => {
                    return checkExist.getPrice(sku, true) !== null;
                });

                if (hasNot25Uses && isNoiseMaker) {
                    offer.log('info', 'contains Noice Maker that are not 25 uses (re-checked).');
                    declineTrade = true;
                }
            }

            const reviewMeta: {
                uniqueReasons: string[];
                reasons: any;
                hasHighValueItems: {
                    our: boolean;
                    their: boolean;
                };
                highValueItems: {
                    our: { skus: string[]; nameWithSpell: string[] };
                    their: { skus: string[]; nameWithSpell: string[] };
                };
            } = offer.data('reviewMeta');

            if (declineTrade === false) {
                this.bot.trades.applyActionToOffer('accept', 'MANUAL', reviewMeta, offer).asCallback(err => {
                    if (err) {
                        this.bot.sendMessage(
                            steamID,
                            `❌ Ohh nooooes! Something went wrong while trying to accept the offer: ${err.message}`
                        );
                        return;
                    }

                    const isManyItems = offer.itemsToGive.length + offer.itemsToReceive.length > 50;

                    if (isManyItems) {
                        this.bot.sendMessage(
                            offer.partner,
                            'My owner have manually accepted your offer and the trade will take a while to complete since it is quite a big offer.' +
                                ' If the trade did not complete after 5-10 minutes had passed, please send your offer again or add me and use !sell/!sellcart or !buy/!buycart command.'
                        );
                    } else {
                        this.bot.sendMessage(
                            offer.partner,
                            'My owner have manually accepted your offer and the trade will be completed in seconds.' +
                                ' If the trade did not complete after 1-2 minutes had passed, please send your offer again or add me and use !sell/!sellcart or !buy/!buycart command.'
                        );
                    }
                    // Send message to recipient if includes some messages
                    if (reply) {
                        this.bot.sendMessage(
                            partnerId,
                            `/quote 💬 Message from ${adminDetails ? adminDetails.player_name : 'admin'}: ${reply}`
                        );
                    }
                });
            } else {
                this.bot.trades.applyActionToOffer('decline', 'MANUAL', {}, offer).asCallback(err => {
                    if (err) {
                        this.bot.sendMessage(
                            steamID,
                            `❌ Ohh nooooes! Something went wrong while trying to decline the offer: ${err.message}`
                        );
                        return;
                    }

                    this.bot.sendMessage(
                        steamID,
                        `❌ Offer #${offer.id} has been automatically decline: contain${
                            hasNot5Uses && hasNot25Uses
                                ? 'Dueling Mini-Game and/or Noise Maker'
                                : hasNot5Uses
                                ? 'Dueling Mini-Game'
                                : 'Noise Maker'
                        } that are not full after re-check...`
                    );

                    this.bot.sendMessage(
                        offer.partner,
                        `Looks like you've used your ${
                            hasNot5Uses && hasNot25Uses
                                ? 'Dueling Mini-Game and/or Noise Maker'
                                : hasNot5Uses
                                ? 'Dueling Mini-Game'
                                : 'Noise Maker'
                        }, thus your offer has been declined.`
                    );
                });
            }
        });
    }

    private declinetradeCommand(steamID: SteamID, message: string): void {
        const offerIdAndMessage = CommandParser.removeCommand(message);
        const offerId = new RegExp(/\d+/).exec(offerIdAndMessage)[0];

        if (isNaN(+offerId) || !offerId) {
            this.bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!decline 3957959294"');
            return;
        }

        const state = this.bot.manager.pollData.received[offerId];

        if (state === undefined) {
            this.bot.sendMessage(steamID, 'Offer does not exist. ❌');
            return;
        }

        if (state !== TradeOfferManager.ETradeOfferState.Active) {
            // TODO: Add what the offer is now, accepted / declined and why
            this.bot.sendMessage(steamID, 'Offer is not active. ❌');
            return;
        }

        const offerData = this.bot.manager.pollData.offerData[offerId];

        if (offerData?.action.action !== 'skip') {
            this.bot.sendMessage(steamID, "Offer can't be reviewed. ❌");
            return;
        }

        this.bot.trades.getOffer(offerId).asCallback((err, offer) => {
            if (err) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Ohh nooooes! Something went wrong while trying to decline the offer: ${err.message}`
                );
                return;
            }

            this.bot.sendMessage(steamID, 'Declining offer...');

            const partnerId = new SteamID(this.bot.manager.pollData.offerData[offerId].partner);
            const reply = offerIdAndMessage.substr(offerId.length);
            const adminDetails = this.bot.friends.getFriend(steamID);

            this.bot.trades.applyActionToOffer('decline', 'MANUAL', {}, offer).asCallback(err => {
                if (err) {
                    this.bot.sendMessage(
                        steamID,
                        `❌ Ohh nooooes! Something went wrong while trying to decline the offer: ${err.message}`
                    );
                    return;
                }
                // Send message to recipient if includes some messages
                if (reply) {
                    this.bot.sendMessage(
                        partnerId,
                        `/quote 💬 Message from ${adminDetails ? adminDetails.player_name : 'admin'}: ${reply}`
                    );
                }
            });
        });
    }

    // Request commands

    private pricecheckCommand(steamID: SteamID, message: string): void {
        message = removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), this.bot.schema));

        requestCheck(params.sku, 'bptf').asCallback((err, body) => {
            if (err) {
                this.bot.sendMessage(
                    steamID,
                    '❌ Error while requesting price check: ' +
                        (err.body && err.body.message ? err.body.message : err.message)
                );
                return;
            }

            this.bot.sendMessage(steamID, `⌛ Price check requested for ${body.name}, the item will be checked.`);
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
            requestCheck(sku, 'bptf').asCallback(err => {
                if (err) {
                    submitted++;
                    failed++;
                    log.warn(
                        'pricecheck failed for ' +
                            sku +
                            ': ' +
                            (err.body && err.body.message ? err.body.message : err.message)
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
        message = removeLinkProtocol(message);
        const params = CommandParser.parseParams(CommandParser.removeCommand(message));

        if (params.sku === undefined) {
            const item = this.getItemFromParams(steamID, params);

            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        }

        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), this.bot.schema));
        const item = SKU.fromString(params.sku);
        const name = this.bot.schema.getName(item);

        let price;

        try {
            price = await getPrice(params.sku, 'bptf');
        } catch (err) {
            this.bot.sendMessage(
                steamID,
                `Error getting price for ${name === null ? params.sku : name}: ${
                    err.body && err.body.message ? err.body.message : err.message
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
            `🔎 ${name}:\n• Buy  : ${currBuy}\n• Sell : ${currSell}\n\nPrices.TF: https://prices.tf/items/${params.sku}`
        );
    }

    private getItemAndAmount(steamID: SteamID, message: string): { match: Entry; amount: number } | null {
        message = removeLinkProtocol(message);
        let name = message;
        let amount = 1;

        if (/^[-]?\d+$/.test(name.split(' ')[0])) {
            // Check if the first part of the name is a number, if so, then that is the amount the user wants to trade
            amount = parseInt(name.split(' ')[0]);
            name = name.replace(amount.toString(), '').trim();
        }

        if (1 > amount) {
            amount = 1;
        }

        if (['!price', '!sellcart', '!buycart', '!sell', '!buy', '!pc', '!s', '!b'].includes(name)) {
            this.bot.sendMessage(
                steamID,
                '⚠️ You forgot to add a name. Here\'s an example: "' +
                    (name.includes('!price')
                        ? '!price'
                        : name.includes('!sellcart')
                        ? '!sellcart'
                        : name.includes('!buycart')
                        ? '!buycart'
                        : name.includes('!sell')
                        ? '!sell'
                        : name.includes('!buy')
                        ? '!buy'
                        : name.includes('!pc')
                        ? '!pc'
                        : name.includes('!s')
                        ? '!s'
                        : '!b') +
                    ' Team Captain"'
            );
            return null;
        }

        let match = this.bot.pricelist.searchByName(name);
        if (match === null) {
            this.bot.sendMessage(
                steamID,
                `❌ I could not find any items in my pricelist that contains "${name}". I may not be trading the item you are looking for.` +
                    '\n\nAlternatively, please try to:' +
                    '\n• Remove "The".' +
                    '\n• Remove "Unusual", just put effect and name. Example: "Kill-a-Watt Vive La France".' +
                    '\n• Remove plural (~s/~es/etc), example: "!buy 2 Mann Co. Supply Crate Key".' +
                    '\n• Some Taunts need "The" such as "Taunt: The High Five!", while others do not.' +
                    '\n• Check for a dash (-) like "All-Father" or "Mini-Engy".' +
                    `\n• Check for a single quote (') like "Orion's Belt" or "Chargin' Targe".` +
                    '\n• Check for a dot (.) like "Lucky No. 42" or "B.A.S.E. Jumper".' +
                    '\n• Check for an exclamation mark (!) like "Bonk! Atomic Punch".' +
                    `\n• If you're trading for uncraftable items, type it like "Non-Craftable Crit-a-Cola".`
            );
            return null;
        } else if (Array.isArray(match)) {
            const matchCount = match.length;
            if (match.length > 20) {
                match = match.splice(0, 20);
            }

            let reply = `I've found ${match.length} items. Try with one of the items shown below:\n${match.join(
                ',\n'
            )}`;
            if (matchCount > match.length) {
                const other = matchCount - match.length;
                reply += `,\nand ${other} other ${pluralize('item', other)}.`;
            }

            this.bot.sendMessage(steamID, reply);
            return null;
        }

        return {
            amount: amount,
            match: match
        };
    }

    private getItemFromParams(steamID: SteamID | string, params: UnknownDictionaryKnownValues): Item | null {
        const item = SKU.fromString('');

        delete item.paint;
        delete item.craftnumber;

        let foundSomething = false;

        if (params.name !== undefined) {
            foundSomething = true;
            // Look for all items that have the same name

            const match: SchemaManager.SchemaItem[] = [];

            for (let i = 0; i < this.bot.schema.raw.schema.items.length; i++) {
                const schemaItem = this.bot.schema.raw.schema.items[i];
                if (schemaItem.item_name === params.name) {
                    match.push(schemaItem);
                }
            }

            if (match.length === 0) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Could not find an item in the schema with the name "${params.name}".`
                );
                return null;
            } else if (match.length !== 1) {
                const matchCount = match.length;

                const parsed = match.splice(0, 20).map(schemaItem => schemaItem.defindex + ` (${schemaItem.name})`);

                let reply = `I've found ${matchCount} items with a matching name. Please use one of the defindexes below as "defindex":\n${parsed.join(
                    ',\n'
                )}`;
                if (matchCount > parsed.length) {
                    const other = matchCount - parsed.length;
                    reply += `,\nand ${other} other ${pluralize('item', other)}.`;
                }

                this.bot.sendMessage(steamID, reply);
                return null;
            }

            item.defindex = match[0].defindex;
            item.quality = match[0].item_quality;
        }

        for (const key in params) {
            if (!Object.prototype.hasOwnProperty.call(params, key)) {
                continue;
            }

            if (item[key] !== undefined) {
                foundSomething = true;
                item[key] = params[key];
                break;
            }
        }

        if (!foundSomething) {
            this.bot.sendMessage(
                steamID,
                '⚠️ Missing item properties. Please refer to: https://github.com/idinium96/tf2autobot/wiki/What-is-the-pricelist%3F'
            );
            return null;
        }

        if (params.defindex !== undefined) {
            const schemaItem = this.bot.schema.getItemByDefindex(params.defindex as number);

            if (schemaItem === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Could not find an item in the schema with the defindex "${params.defindex}".`
                );
                return null;
            }

            item.defindex = schemaItem.defindex;

            if (item.quality === 0) {
                item.quality = schemaItem.item_quality;
            }
        }

        if (params.quality !== undefined) {
            const quality = this.bot.schema.getQualityIdByName(params.quality as string);
            if (quality === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Could not find a quality in the schema with the name "${params.quality}".`
                );
                return null;
            }

            item.quality = quality;
        }

        if (params.craftable !== undefined) {
            if (typeof params.craftable !== 'boolean') {
                this.bot.sendMessage(steamID, `Craftable must be "true" or "false" only.`);
                return null;
            }
            item.craftable = params.craftable;
        }

        if (params.australium !== undefined) {
            if (typeof params.australium !== 'boolean') {
                this.bot.sendMessage(steamID, `Australium must be "true" or "false" only.`);
                return null;
            }
            item.australium = params.australium;
        }

        if (params.killstreak !== undefined) {
            const killstreak = parseInt(params.killstreak);
            if (isNaN(killstreak) || killstreak < 1 || killstreak > 3) {
                this.bot.sendMessage(
                    steamID,
                    `Unknown killstreak "${params.killstreak}", it must be between 1 (Basic KS), 2 (Spec KS) or 3 (Pro KS) only.`
                );
                return null;
            }
            item.killstreak = killstreak;
        }

        if (params.paintkit !== undefined) {
            const paintkit = this.bot.schema.getSkinIdByName(params.paintkit as string);
            if (paintkit === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Could not find a skin in the schema with the name "${item.paintkit}".`
                );
                return null;
            }

            item.paintkit = paintkit;
        }

        if (params.effect !== undefined) {
            const effect = this.bot.schema.getEffectIdByName(params.effect as string);

            if (effect === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Could not find an unusual effect in the schema with the name "${params.effect}".`
                );
                return null;
            }

            item.effect = effect;
        }

        if (typeof params.output === 'number') {
            // User gave defindex

            const schemaItem = this.bot.schema.getItemByDefindex(params.output);

            if (schemaItem === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Could not find an item in the schema with the defindex "${params.defindex}".`
                );
                return null;
            }

            if (item.outputQuality === null) {
                item.quality = schemaItem.item_quality;
            }
        } else if (item.output !== null) {
            // Look for all items that have the same name

            const match: SchemaManager.SchemaItem[] = [];

            for (let i = 0; i < this.bot.schema.raw.schema.items.length; i++) {
                const schemaItem = this.bot.schema.raw.schema.items[i];
                if (schemaItem.item_name === params.name) {
                    match.push(schemaItem);
                }
            }

            if (match.length === 0) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Could not find an item in the schema with the name "${params.name}".`
                );
                return null;
            } else if (match.length !== 1) {
                const matchCount = match.length;

                const parsed = match.splice(0, 20).map(schemaItem => schemaItem.defindex + ` (${schemaItem.name})`);

                let reply = `I've found ${matchCount} items with a matching name. Please use one of the defindexes below as "output":\n${parsed.join(
                    ',\n'
                )}`;
                if (matchCount > parsed.length) {
                    const other = matchCount - parsed.length;
                    reply += `,\nand ${other} other ${pluralize('item', other)}.`;
                }

                this.bot.sendMessage(steamID, reply);
                return null;
            }

            item.output = match[0].defindex;

            if (item.outputQuality === null) {
                item.quality = match[0].item_quality;
            }
        }

        if (params.outputQuality !== undefined) {
            const quality = this.bot.schema.getQualityIdByName(params.outputQuality as string);

            if (quality === null) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Could not find a quality in the schema with the name "${params.outputQuality}".`
                );
                return null;
            }

            item.outputQuality = quality;
        }

        for (const key in params) {
            if (!Object.prototype.hasOwnProperty.call(params, key)) {
                continue;
            }

            if (item[key] !== undefined) {
                delete params[key];
            }
        }

        delete params.name;

        return fixItem(item, this.bot.schema);
    }

    private craftWeapons(): string[] {
        const craftWeapons = (this.bot.handler as MyHandler).weapons().craftAll;

        const items: { amount: number; name: string }[] = [];

        craftWeapons.forEach(sku => {
            const amount = this.bot.inventoryManager.getInventory().getAmount(sku);
            if (amount > 0) {
                items.push({
                    name: this.bot.schema.getName(SKU.fromString(sku), false),
                    amount: amount
                });
            }
        });

        items.sort(function(a, b) {
            if (a.amount === b.amount) {
                if (a.name < b.name) {
                    return -1;
                } else if (a.name > b.name) {
                    return 1;
                } else {
                    return 0;
                }
            }
            return b.amount - a.amount;
        });

        const craftWeaponsStock: string[] = [];

        if (items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                craftWeaponsStock.push(items[i].name + ': ' + items[i].amount);
            }
        }
        return craftWeaponsStock;
    }

    private uncraftWeapons(): string[] {
        const uncraftWeapons = (this.bot.handler as MyHandler).weapons().uncraftAll;

        const items: { amount: number; name: string }[] = [];

        uncraftWeapons.forEach(sku => {
            const amount = this.bot.inventoryManager.getInventory().getAmount(sku);
            if (amount > 0) {
                items.push({
                    name: this.bot.schema.getName(SKU.fromString(sku), false),
                    amount: this.bot.inventoryManager.getInventory().getAmount(sku)
                });
            }
        });

        items.sort(function(a, b) {
            if (a.amount === b.amount) {
                if (a.name < b.name) {
                    return -1;
                } else if (a.name > b.name) {
                    return 1;
                } else {
                    return 0;
                }
            }
            return b.amount - a.amount;
        });

        const uncraftWeaponsStock: string[] = [];

        if (items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                uncraftWeaponsStock.push(items[i].name + ': ' + items[i].amount);
            }
        }
        return uncraftWeaponsStock;
    }

    private messageInputsStartWith(): string[] {
        const words = [
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
        ];
        return words;
    }

    private messageInputEndsWith(): string[] {
        const words = ['cart.', 'checkout.', '✅'];
        return words;
    }
};

function removeLinkProtocol(message: string): string {
    return message.replace(/(\w+:|^)\/\//g, '');
}

function summarizeItems(dict: UnknownDictionary<number>, schema: SchemaManager.Schema): string {
    if (dict === null) {
        return 'unknown items';
    }

    const summary: string[] = [];

    for (const sku in dict) {
        if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
            continue;
        }

        const amount = dict[sku];
        const name = schema.getName(SKU.fromString(sku), false);

        summary.push(name + (amount > 1 ? ' x' + amount : ''));
    }

    if (summary.length === 0) {
        return 'nothing';
    }

    return summary.join(', ');
}
