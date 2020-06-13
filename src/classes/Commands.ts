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
import DiscordWebhook from './DiscordWebhook';

import { Item, Currency } from '../types/TeamFortress2';
import { UnknownDictionaryKnownValues, UnknownDictionary } from '../types/common';
import { fixItem } from '../lib/items';
import { requestCheck, getPrice } from '../lib/ptf-api';
import validator from '../lib/validator';
import log from '../lib/logger';
import SchemaManager from 'tf2-schema';

const COMMANDS: string[] = [
    '!help - Get list of commands',
    '!how2trade - Guide on how to use and trade with the bot',
    '!time - Show owner current time 🕥',
    '!price [amount] <name> - Get the price and stock of an item',
    '!stock - Get a list of items that the bot has',
    '!pure - Get current pure stock 💰',
    '!rate - Get current key prices 🔑',
    '!message <your message> - Send a message to the owner of the bot 💬',
    '!buy [amount] <name> - Instantly buy an item 💲',
    '!sell [amount] <name> - Instantly sell an item 💲',
    '!buycart [amount] <name> - Adds an item you want to buy to the cart 🛒',
    '!sellcart [amount] <name> - Adds an item you want to sell to the cart 🛒',
    '!cart - See current cart 🛒',
    '!clearcart - Clears the current cart ❎🛒',
    '!checkout - Make the bot send an offer the items in the cart ✅🛒',
    '!queue - See your position in the queue',
    '!cancel - Cancel an already made offer, or cancel offer being made ❌'
];

const ADMIN_COMMANDS: string[] = [
    '!deposit <name=>&<amount=> - Used to deposit items',
    '!withdraw <name=>&<amount=> - Used to withdraw items',
    '!add - Add a pricelist entry ➕',
    '!update - Update a pricelist entry',
    '!remove <sku=> OR <item=> - Remove a pricelist entry ➖',
    '!get <sku=> OR <item=> - Get raw information about a pricelist entry',
    '!pricecheck <sku=> OR <item=> - Requests an item to be priced by PricesTF',
    '!check sku=<item sku> - Request current price for an item from Prices.TF',
    '!expand <craftable=true|false> - Uses Backpack Expanders to increase the inventory limit',
    '!delete sku=<item sku> - Delete any item (use only sku) 🚮',
    '!stop - Stop the bot 🔴',
    '!restart - Restart the bot 🔄',
    '!version - Get version that the bot is running',
    '!autokeys - Get info on your current autoBuy/Sell Keys settings 🔑',
    '!avatar <image_URL> - Change avatar',
    '!name <new_name> - Change name',
    '!stats - Get statistics for accepted trades 📊',
    '!trades - Get a list of offers pending for manual review 🔍',
    '!trade <offerID> - Get info about a trade',
    '!accept <offerID> [Your Message] - Manually accept an active offer ✅🔍',
    '!decline <offerID> [Your Message] - Manually decline an active offer ❌🔍',
    '!message <steamid> <your message> - Send a message to a user 💬'
];

export = class Commands {
    private readonly bot: Bot;

    readonly discord: DiscordWebhook;

    constructor(bot: Bot) {
        this.bot = bot;
        this.discord = new DiscordWebhook(bot);
    }

    get cartQueue(): CartQueue {
        return (this.bot.getHandler() as MyHandler).cartQueue;
    }

    processMessage(steamID: SteamID, message: string): void {
        const command = CommandParser.getCommand(message);

        const isAdmin = this.bot.isAdmin(steamID);

        if (command === 'help') {
            this.helpCommand(steamID);
        } else if (command === 'how2trade') {
            this.howToTradeCommand(steamID);
        } else if (command === 'price') {
            this.priceCommand(steamID, message);
        } else if (command === 'stock') {
            this.stockCommand(steamID);
        } else if (command === 'pure') {
            this.pureCommand(steamID);
        } else if (command === 'time') {
            this.timeCommand(steamID);
        } else if (command === 'autokeys' && isAdmin) {
            this.autoKeysCommand(steamID);
        } else if (command === 'rate') {
            this.rateCommand(steamID);
        } else if (command === 'message') {
            this.messageCommand(steamID, message);
        } else if (command === 'cart') {
            this.cartCommand(steamID);
        } else if (command === 'clearcart') {
            this.clearCartCommand(steamID);
        } else if (command === 'checkout') {
            this.checkoutCommand(steamID);
        } else if (command === 'queue') {
            this.queueCommand(steamID);
        } else if (command === 'cancel') {
            this.cancelCommand(steamID);
        } else if (command === 'deposit' && isAdmin) {
            this.depositCommand(steamID, message);
        } else if (command === 'withdraw' && isAdmin) {
            this.withdrawCommand(steamID, message);
        } else if (command === 'buycart') {
            this.buyCartCommand(steamID, message);
        } else if (command === 'sellcart') {
            this.sellCartCommand(steamID, message);
        } else if (command === 'buy') {
            this.buyCommand(steamID, message);
        } else if (command === 'sell') {
            this.sellCommand(steamID, message);
        } else if (command === 'get' && isAdmin) {
            this.getCommand(steamID, message);
        } else if (command === 'add' && isAdmin) {
            this.addCommand(steamID, message);
        } else if (command === 'remove' && isAdmin) {
            this.removeCommand(steamID, message);
        } else if (command === 'update' && isAdmin) {
            this.updateCommand(steamID, message);
        } else if (command === 'pricecheck' && isAdmin) {
            this.pricecheckCommand(steamID, message);
        } else if (command === 'check' && isAdmin) {
            this.checkCommand(steamID, message);
        } else if (command === 'delete' && isAdmin) {
            this.deleteCommand(steamID, message);
        } else if (command === 'expand' && isAdmin) {
            this.expandCommand(steamID, message);
        } else if (command === 'stop' && isAdmin) {
            this.stopCommand(steamID);
        } else if (command === 'restart' && isAdmin) {
            this.restartCommand(steamID);
        } else if (command === 'version' && isAdmin) {
            this.versionCommand(steamID);
        } else if (command === 'name' && isAdmin) {
            this.nameCommand(steamID, message);
        } else if (command === 'avatar' && isAdmin) {
            this.avatarCommand(steamID, message);
        } else if (command === 'stats' && isAdmin) {
            this.statsCommand(steamID);
        } else if (command === 'trades' && isAdmin) {
            this.tradesCommand(steamID);
        } else if (command === 'trade' && isAdmin) {
            this.tradeCommand(steamID, message);
        } else if ((command === 'accepttrade' || command === 'accept') && isAdmin) {
            this.accepttradeCommand(steamID, message);
        } else if ((command === 'declinetrade' || command === 'decline') && isAdmin) {
            this.declinetradeCommand(steamID, message);
        } else if (
            message.startsWith('I') || // tf2-automatic bots
            message.startsWith('❌') ||
            message.startsWith('Hi') ||
            message.startsWith('🙋🏻‍♀️Hi') ||
            message.startsWith('⚠') ||
            message.startsWith('⚠️') ||
            message.startsWith('✅') ||
            message.startsWith('⌛') ||
            message.startsWith('💲') ||
            message.startsWith('📜') ||
            message.startsWith('🛒') ||
            message.startsWith('💰') ||
            message.startsWith('Here') ||
            message.startsWith('The') || // or 'There'
            message.startsWith('Please') ||
            message.startsWith('You') || // Or 'Your'
            message.startsWith('/quote') ||
            message.startsWith('/pre') ||
            message.startsWith('/me') ||
            message.startsWith('/code') ||
            message.startsWith('Oh') || // If errors occured
            message.startsWith('Success!') ||
            message.endsWith('cart.') ||
            message.endsWith('checkout.') ||
            message.endsWith('✅') ||
            message.startsWith('Hey') || // Other bots possible messages - Bot.tf
            message.startsWith('Unfortunately') ||
            message.startsWith('==') ||
            message.startsWith('💬') ||
            message.startsWith('⇌') ||
            message.startsWith('Command') || // Other custom bots
            message.startsWith('Hello')
            // TODO: Find more possible messages from any other custom bots
        ) {
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
        let reply = `📜 Here's a list of all my commands:\n- ${COMMANDS.join('\n- ')}`;

        if (this.bot.isAdmin(steamID)) {
            reply += `\n\nAdmin commands:\n- ${ADMIN_COMMANDS.join('\n- ')}`;
        }

        this.bot.sendMessage(steamID, reply);
    }

    private howToTradeCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            process.env.CUSTOM_HOW2TRADE_MESSAGE
                ? process.env.CUSTOM_HOW2TRADE_MESSAGE
                : '/quote You can either send me an offer yourself, or use one of my commands to request a trade. Say you want to buy a Team Captain, just type "!buy Team Captain". Type "!help" for all the commands.' +
                      '\nYou can also buy or sell multiple items by using "!buycart" or "!sellcart" commands.'
        );
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

    private timeCommand(steamID: SteamID): void {
        const time = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC') //timezone format: https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
            .format(process.env.CUSTOM_TIME_FORMAT ? process.env.CUSTOM_TIME_FORMAT : 'MMMM Do YYYY, HH:mm:ss ZZ'); // refer: https://www.tutorialspoint.com/momentjs/momentjs_format.htm

        const timeEmoji = moment()
            .tz(process.env.TIMEZONE ? process.env.TIMEZONE : 'UTC')
            .format();
        const emoji =
            timeEmoji.includes('T00:') || timeEmoji.includes('T12:')
                ? '🕛'
                : timeEmoji.includes('T01:') || timeEmoji.includes('T13:')
                ? '🕐'
                : timeEmoji.includes('T02:') || timeEmoji.includes('T14:')
                ? '🕑'
                : timeEmoji.includes('T03:') || timeEmoji.includes('T15:')
                ? '🕒'
                : timeEmoji.includes('T04:') || timeEmoji.includes('T16:')
                ? '🕓'
                : timeEmoji.includes('T05:') || timeEmoji.includes('T17:')
                ? '🕔'
                : timeEmoji.includes('T06:') || timeEmoji.includes('T18:')
                ? '🕕'
                : timeEmoji.includes('T07:') || timeEmoji.includes('T19:')
                ? '🕖'
                : timeEmoji.includes('T08:') || timeEmoji.includes('T20:')
                ? '🕗'
                : timeEmoji.includes('T09:') || timeEmoji.includes('T21:')
                ? '🕘'
                : timeEmoji.includes('T10:') || timeEmoji.includes('T22:')
                ? '🕙'
                : timeEmoji.includes('T11:') || timeEmoji.includes('T23:')
                ? '🕚'
                : '';

        const note = process.env.TIME_ADDITIONAL_NOTES ? process.env.TIME_ADDITIONAL_NOTES : '';

        this.bot.sendMessage(
            steamID,
            `My owner time is currently at ${emoji} ${time + (note !== '' ? `. ${note}.` : '.')}`
        );
    }

    private pureCommand(steamID: SteamID): void {
        const pureStock = this.pureStock();

        this.bot.sendMessage(steamID, `💰 I have currently ${pureStock.join(' and ')} in my inventory.`);
    }

    private pureStock(): string[] {
        const pureStock: string[] = [];
        const pureScrap = this.bot.inventoryManager.getInventory().getAmount('5000;6') * (1 / 9);
        const pureRec = this.bot.inventoryManager.getInventory().getAmount('5001;6') * (1 / 3);
        const pureRef = this.bot.inventoryManager.getInventory().getAmount('5002;6');
        const pureKeys = this.bot.inventoryManager.getInventory().getAmount('5021;6');
        const pureScrapTotal = Currencies.toScrap(pureRef + pureRec + pureScrap);
        const pure = [
            {
                name: pluralize('key', pureKeys),
                amount: pureKeys
            },
            {
                name: pluralize('ref', pureScrapTotal),
                amount: Currencies.toRefined(pureScrapTotal)
            }
        ];
        for (let i = 0; i < pure.length; i++) {
            pureStock.push(`${pure[i].amount} ${pure[i].name}`);
        }
        return pureStock;
    }

    private autoKeysCommand(steamID: SteamID): void {
        if (process.env.ENABLE_AUTO_SELL_AND_BUY_KEYS === 'false') {
            this.bot.sendMessage(steamID, `This feature is disabled.`);
            return;
        }

        const currKeys = this.bot.inventoryManager.getInventory().getAmount('5021;6');
        const currScrap = this.bot.inventoryManager.getInventory().getAmount('5000;6') * (1 / 9);
        const currRec = this.bot.inventoryManager.getInventory().getAmount('5001;6') * (1 / 3);
        const currRef = this.bot.inventoryManager.getInventory().getAmount('5002;6');
        const currReftoScrap = Currencies.toScrap(currRef + currRec + currScrap);

        const userMinKeys = parseInt(process.env.MINIMUM_KEYS);
        const userMaxKeys = parseInt(process.env.MAXIMUM_KEYS);
        const userMinReftoScrap = Currencies.toScrap(parseInt(process.env.MINIMUM_REFINED_TO_START_SELL_KEYS));
        const userMaxReftoScrap = Currencies.toScrap(parseInt(process.env.MAXIMUM_REFINED_TO_STOP_SELL_KEYS));

        const isBuyingKeys = (currReftoScrap > userMaxReftoScrap && currKeys < userMaxKeys) !== false;
        const isSellingKeys = (currReftoScrap < userMinReftoScrap && currKeys > userMinKeys) !== false;
        const enableKeyBanking = process.env.ENABLE_AUTO_BANKING !== 'false';
        const isBankingKeys =
            (currReftoScrap > userMinReftoScrap && currReftoScrap < userMaxReftoScrap && currKeys > userMinKeys) !==
            false;

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
            currKeys < userMinKeys
                ? keyBlMin
                : currKeys > userMaxKeys
                ? keyAbMax
                : currKeys > userMinKeys && currKeys < userMaxKeys
                ? keyAtBet
                : currKeys === userMinKeys
                ? keyAtMin
                : currKeys === userMaxKeys
                ? keyAtMax
                : '';
        const refsPosition =
            currReftoScrap < userMinReftoScrap
                ? refBlMin
                : currReftoScrap > userMaxReftoScrap
                ? refAbMax
                : currReftoScrap > userMinReftoScrap && currReftoScrap < userMaxReftoScrap
                ? refAtBet
                : currReftoScrap === userMinReftoScrap
                ? refAtMin
                : currReftoScrap === userMaxReftoScrap
                ? refAtMax
                : '';
        const summary = `\n• ${userMinKeys} ≤ ${pluralize(
            'key',
            currKeys
        )}(${currKeys}) ≤ ${userMaxKeys}\n• ${Currencies.toRefined(userMinReftoScrap)} < ${pluralize(
            'ref',
            Currencies.toRefined(currReftoScrap)
        )}(${Currencies.toRefined(currReftoScrap)}) < ${Currencies.toRefined(userMaxReftoScrap)}`;

        let reply = `Your current AutoKeys settings:\n${summary}\n\nDiagram:\n${keysPosition}\n${keysLine}\n${refsPosition}\n${refsLine}\n${xAxisRef}\n`;
        reply += `\n   Auto-banking: ${enableKeyBanking ? 'enabled' : 'disabled'}`;
        reply += `\nAutokeys status: ${
            isBankingKeys ? 'banking' : isSellingKeys ? 'selling' : isBuyingKeys ? 'buying' : 'not active'
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

    private messageCommand(steamID: SteamID, message: string): void {
        const isAdmin = this.bot.isAdmin(steamID);
        const parts = message.split(' ');

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
            if (parts.length < 3) {
                this.bot.sendMessage(
                    steamID,
                    '❌ Your syntax is wrong. Here\'s an example: "!message 76561198120070906 Hi"'
                );
                return;
            }

            const recipient = parts[1];

            const recipientSteamID = new SteamID(recipient);

            if (!recipientSteamID.isValid()) {
                this.bot.sendMessage(steamID, `❌ "${recipient}" is not a valid steamid.`);
                return;
            } else if (!this.bot.friends.isFriend(recipientSteamID)) {
                this.bot.sendMessage(steamID, '❌ I am not friends with the user.');
                return;
            }

            const recipentDetails = this.bot.friends.getFriend(recipientSteamID);

            const reply = message.substr(message.toLowerCase().indexOf(recipient) + 18);

            // Send message to recipient
            this.bot.sendMessage(
                recipient,
                `/quote 💬 Message from ${adminDetails ? adminDetails.player_name : 'admin'}: ${reply}`
            );

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

            if (
                process.env.DISABLE_DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER === 'false' &&
                process.env.DISCORD_WEBHOOK_MESSAGE_FROM_PARTNER_URL
            ) {
                this.discord.sendPartnerMessage(
                    steamID.toString(),
                    msg,
                    adminDetails.player_name,
                    adminDetails.avatar_url_full
                );
            } else {
                this.bot.messageAdmins(
                    `/quote 💬 You've got a message from #${steamID} (${adminDetails.player_name}):
                    
                    "${msg}".
                    
                    Steam: https://steamcommunity.com/profiles/${steamID}
                    Backpack.tf: https://backpack.tf/profiles/${steamID}
                    SteamREP: https://steamrep.com/profiles/${steamID}`,
                    []
                );
            }
            this.bot.sendMessage(steamID, '✅ Your message has been sent.');
        }
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
                    '⌛ Your offer is already being canceled. Please wait a few seconds for it to be canceled.'
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
                    '⌛ You are already in the queue! Please wait while I process your offer.'
                );
            } else {
                this.bot.sendMessage(
                    cart.partner,
                    '⌛ You are already in the queue! Please wait your turn, there ' +
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
                '⌛ You have been added to the queue! Please wait your turn, there ' +
                    (position !== 1 ? 'are' : 'is') +
                    ` ${position} infront of you.`
            );
            if (position >= 2 && process.env.DISABLE_SOMETHING_WRONG_ALERT === 'false') {
                if (
                    process.env.DISABLE_DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT === 'false' &&
                    process.env.DISCORD_WEBHOOK_SOMETHING_WRONG_ALERT_URL
                ) {
                    this.discord.sendQueueAlert(position);
                } else {
                    this.bot.messageAdmins(`⚠️ [Queue alert] Current position: ${position}`, []);
                }
            }
        }
    }

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
                `Error getting price for ${name}: ${err.body && err.body.message ? err.body.message : err.message}`
            );
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

        if (params.name !== undefined || params.item !== undefined) {
            this.bot.sendMessage(
                steamID,
                `⚠️ Please only use sku property.

                Below are some common items to delete:
                • Smissamas Sweater: 16391;15;untradable;w1;pk391
                • Soul Gargoyle: 5826;6;uncraftable;untradable
                • Noice Maker - TF Birthday: 536;6;untradable
                • Bronze Dueling Badge: 242;6;untradable
                • Silver Dueling Badge: 243;6;untradable
                • Gold Dueling Badge: 244;6;untradable
                • Platinum Dueling Badge: 245;6;untradable
                • Mercenary: 166;6;untradable
                • Soldier of Fortune: 165;6;untradable
                • Grizzled Veteran: 164;6;untradable
                • Primeval Warrior: 170;6;untradable
                • Professor Speks: 343;6;untradable
                • Mann Co. Cap: 261;6;untradable
                • Mann Co. Online Cap: 994;6;untradable
                • Proof of Purchase: 471;6;untradable
                • Mildly Disturbing Halloween Mask: 115;6;untradable
                • Seal Mask: 582;6;untradable
                • Pyrovision Goggles: 743;6;untradable
                • Giftapult: 5083;6;untradable
                • Spirit Of Giving: 655;11;untradable
                • Party Hat: 537;6;untradable
                • Name Tag: 5020;6;untradable
                • Description Tag: 5044;6;untradable
                • Ghastly Gibus: 584;6;untradable
                • Ghastlier Gibus: 279;6;untradable
                • Power Up Canteen: 489;6;untradable
                • Bombinomicon: 583;6;untradable
                • Skull Island Topper: 941;6;untradable
                • Spellbook Page: 8935;6;untradable
                • Gun Mettle Campaign Coin: 5809;6;untradable
                • MONOCULUS!: 581;6;untradable
                
                Or other items, please refer here: https://bit.ly/3gZQxFQ (defindex)`
            );
            return;
        }

        if (params.sku === undefined) {
            this.bot.sendMessage(steamID, '⚠️ Missing item sku');
            return;
        }

        let uncraft = false;
        if (params.sku.includes('uncraftable')) {
            params.sku = params.sku.replace(';uncraftable', '');
            uncraft = true;
        }

        let untrade = false;
        if (params.sku.includes('untradable')) {
            params.sku = params.sku.replace(';untradable', '');
            untrade = true;
        }

        const item = SKU.fromString(params.sku);

        if (uncraft) {
            item.craftable = false;
        }

        if (untrade) {
            item.tradable = false;
        }

        const assetids = this.bot.inventoryManager.getInventory().findBySKU(SKU.fromObject(item), false);

        const name = this.bot.schema.getName(item, false);

        if (assetids.length === 0) {
            // No backpack expanders
            this.bot.sendMessage(steamID, `❌ I couldn't find any ${pluralize(name, 0)}`);
            return;
        }

        this.bot.tf2gc.deleteItem(assetids[0], err => {
            if (err) {
                log.warn(`Error trying to delete ${name}: `, err);
                this.bot.sendMessage(steamID, `❌ Failed to delete ${name}: ${err.message}`);
                return;
            }

            this.bot.sendMessage(steamID, `✅ Deleted ${name}!`);
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
                        '❌ You are not running the bot with PM2! See the documentation: https://github.com/Nicklason/tf2-automatic/wiki/PM2'
                    );
                }
            })
            .catch(err => {
                log.warn('Error occurred while trying to restart: ', err);
                this.bot.sendMessage(steamID, `❌ An error occurred while trying to restart: ${err.message}`);
            });
    }

    private versionCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            `Currently running tf2-automatic@v${process.env.BOT_VERSION}. Checking for a new version...`
        );

        this.bot
            .checkForUpdates()
            .then(({ hasNewVersion, latestVersion }) => {
                if (!hasNewVersion) {
                    this.bot.sendMessage(steamID, 'You are running the latest version of tf2-automatic!');
                } else if (this.bot.lastNotifiedVersion === latestVersion) {
                    this.bot.sendMessage(
                        steamID,
                        `⚠️ Update available! Current: v${process.env.BOT_VERSION}, Latest: v${latestVersion}.\nNavigate to your bot folder and run [git stash && git checkout Public && git pull && npm install && npm run build] and then restart your bot.` +
                            '\n Contact IdiNium if you have any other problem. Thank you.'
                    );
                }
            })
            .catch(err => {
                this.bot.sendMessage(steamID, `❌ Failed to check for updates: ${err.message}`);
            });
    }

    private nameCommand(steamID: SteamID, message: string): void {
        const newName = CommandParser.removeCommand(message);

        if (newName === '') {
            this.bot.sendMessage(steamID, '❌ You forgot to add a name. Example: "!name Nicklason"');
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

        if (imageUrl === '') {
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

    private statsCommand(steamID: SteamID): void {
        const now = moment();
        const aDayAgo = moment().subtract(24, 'hour');
        const startOfDay = moment().startOf('day');

        let tradesToday = 0;
        let trades24Hours = 0;
        let tradesTotal = 0;

        const pollData = this.bot.manager.pollData;
        const oldestId = pollData.offerData === undefined ? undefined : Object.keys(pollData.offerData)[0];
        const timeSince =
            +process.env.TRADING_STARTING_TIME_UNIX === 0
                ? pollData.timestamps[oldestId]
                : +process.env.TRADING_STARTING_TIME_UNIX;
        const totalDays = !timeSince ? 0 : now.diff(moment.unix(timeSince), 'days');

        const offerData = this.bot.manager.pollData.offerData;
        for (const offerID in offerData) {
            if (!Object.prototype.hasOwnProperty.call(offerData, offerID)) {
                continue;
            }

            if (offerData[offerID].handledByUs === true && offerData[offerID].isAccepted === true) {
                // Sucessful trades handled by the bot
                tradesTotal++;

                if (offerData[offerID].finishTimestamp >= aDayAgo.valueOf()) {
                    // Within the last 24 hours
                    trades24Hours++;
                }

                if (offerData[offerID].finishTimestamp >= startOfDay.valueOf()) {
                    // All trades since 0:00 in the morning.
                    tradesToday++;
                }
            }
        }

        this.bot.sendMessage(
            steamID,
            'All trades are recorded from ' +
                pluralize('day', totalDays, true) +
                ' ago 📊\n\n Total: ' +
                (process.env.LAST_TOTAL_TRADES ? +process.env.LAST_TOTAL_TRADES + tradesTotal : tradesTotal) +
                ' \n Last 24 hours: ' +
                trades24Hours +
                ' \n Since beginning of today: ' +
                tradesToday
        );
    }

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

            reply += `\n- Offer #${offer.id} from ${
                offer.data.partner
            } (reason: ${offer.data.action.meta.uniqueReasons.join(', ')})`;
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

        let reply = `Offer #${offerId} from ${offerData.partner} is pending for review. ⚠️
        Reason: ${offerData.action.meta.uniqueReasons.join(', ')}).
        Summary:\n\n`;

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

        this.bot.sendMessage(steamID, reply);
    }

    private accepttradeCommand(steamID: SteamID, message: string): void {
        const offerIdAndMessage = CommandParser.removeCommand(message);
        const offerId = new RegExp(/\d+/).exec(offerIdAndMessage);
        let offerIdString: string;
        if (isNaN(+offerId) || !offerId) {
            this.bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!accept 3957959294"');
            return;
        } else {
            offerIdString = offerId.toString();
        }

        const state = this.bot.manager.pollData.received[offerIdString];

        if (state === undefined) {
            this.bot.sendMessage(steamID, '❌ Offer does not exist.');
            return;
        }

        if (state !== TradeOfferManager.ETradeOfferState.Active) {
            // TODO: Add what the offer is now, accepted / declined and why
            this.bot.sendMessage(steamID, '❌ Offer is not active.');
            return;
        }

        const offerData = this.bot.manager.pollData.offerData[offerIdString];

        if (offerData?.action.action !== 'skip') {
            this.bot.sendMessage(steamID, "❌ Offer can't be reviewed.");
            return;
        }

        this.bot.trades.getOffer(offerIdString).asCallback((err, offer) => {
            if (err) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Ohh nooooes! Something went wrong while trying to accept the offer: ${err.message}`
                );
                return;
            }

            this.bot.sendMessage(steamID, 'Accepting offer...');

            const partnerId = new SteamID(this.bot.manager.pollData.offerData[offerIdString].partner);
            const reply = offerIdAndMessage.substr(offerIdString.length);
            const adminDetails = this.bot.friends.getFriend(steamID);

            this.bot.trades.applyActionToOffer('accept', 'MANUAL', {}, offer).asCallback(err => {
                if (err) {
                    this.bot.sendMessage(
                        steamID,
                        `❌ Ohh nooooes! Something went wrong while trying to accept the offer: ${err.message}`
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

    private declinetradeCommand(steamID: SteamID, message: string): void {
        const offerIdAndMessage = CommandParser.removeCommand(message);
        const offerId = new RegExp(/\d+/).exec(offerIdAndMessage);
        let offerIdString: string;
        if (isNaN(+offerId) || !offerId) {
            this.bot.sendMessage(steamID, '⚠️ Missing offer id. Example: "!decline 3957959294"');
            return;
        } else {
            offerIdString = offerId.toString();
        }

        const state = this.bot.manager.pollData.received[offerIdString];

        if (state === undefined) {
            this.bot.sendMessage(steamID, '❌ Offer does not exist.');
            return;
        }

        if (state !== TradeOfferManager.ETradeOfferState.Active) {
            // TODO: Add what the offer is now, accepted / declined and why
            this.bot.sendMessage(steamID, '❌ Offer is not active.');
            return;
        }

        const offerData = this.bot.manager.pollData.offerData[offerIdString];

        if (offerData?.action.action !== 'skip') {
            this.bot.sendMessage(steamID, "❌ Offer can't be reviewed.");
            return;
        }

        this.bot.trades.getOffer(offerIdString).asCallback((err, offer) => {
            if (err) {
                this.bot.sendMessage(
                    steamID,
                    `❌ Ohh nooooes! Something went wrong while trying to decline the offer: ${err.message}`
                );
                return;
            }

            this.bot.sendMessage(steamID, 'Declining offer...');

            const partnerId = new SteamID(this.bot.manager.pollData.offerData[offerIdString].partner);
            const reply = offerIdAndMessage.substr(offerIdString.length);
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

        if (!name) {
            this.bot.sendMessage(steamID, '⚠️ You forgot to add a name. Here\'s an example: "!price Team Captain"');
            return null;
        }

        let match = this.bot.pricelist.searchByName(name);
        if (match === null) {
            this.bot.sendMessage(
                steamID,
                `❌ I could not find any items in my pricelist that contains "${name}", I might not be trading the item you are looking for.
                
                Alternatively, please try:
                • remove "The".
                • remove "Unusual", just put effect and name, example: "Kill-a-Watt Vive La France".
                • remove plural (~s/~es/etc), example: "!buy 2 Mann Co. Supply Crate Key".
                • some Taunt needs "The" like "Taunt: The High Five!", and some are not.
                • check for dash (-) like "All-Father" or "Mini-Engy".
                • check for single quote (') like "Orion's Belt" or "Chargin' Targe".
                • check for dot (.) like "Lucky No. 42" or "B.A.S.E. Jumper".
                • check for exclamation mark (!) like "Bonk! Atomic Punch".
                • if you're looking for uncraftable items, do it like "Non-Craftable Crit-a-Cola".`
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
            this.bot.sendMessage(steamID, '⚠️ Missing item properties.');
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
                this.bot.sendMessage(steamID, `❌ Craftable must be "true" or "false" only.`);
                return null;
            }
            if (params.craftable === false) {
                item.craftable = false;
            } else {
                item.craftable = true;
            }
        }

        if (params.australium !== undefined) {
            if (typeof params.australium !== 'boolean') {
                this.bot.sendMessage(steamID, `❌ Australium must be "true" or "false" only.`);
                return null;
            }
            if (params.australium === false) {
                item.australium = false;
            } else {
                item.australium = true;
            }
        }

        if (params.killstreak !== undefined) {
            const killstreak = parseInt(params.killstreak);
            if (isNaN(killstreak) || killstreak > 3) {
                this.bot.sendMessage(steamID, `❌ Unknown killstreak "${params.killstreak}".`);
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
