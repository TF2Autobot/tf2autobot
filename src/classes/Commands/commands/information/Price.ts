import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import { getItemAndAmount } from '../../functions/utils';
import pluralize from 'pluralize';
import Currencies from '@tf2autobot/tf2-currencies';
import dayjs from 'dayjs';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';
import CommandParser from '../../../CommandParser';

export default class PriceCommand implements ICommand {
    name = 'price';

    aliases = ['p'];

    usage = '[amount] <name>';

    description = 'Get the price and stock of an item.';

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
        const opt = this.bot.options.commands.price;
        const prefix = this.bot.getPrefix(steamID);

        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const info = getItemAndAmount(steamID, CommandParser.removeCommand(message), this.bot, prefix);
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

        reply += `.\n📦 I have ${this.bot.inventoryManager.getInventory.getAmount({
            priceKey: match.id ?? match.sku,
            includeNonNormalized: false,
            tradableOnly: true
        })}`;

        if (match.max !== -1 && isBuying) {
            reply += ` / ${match.max}`;
        }

        if (isSelling && match.min !== 0) {
            reply += ` and I can sell ${this.bot.inventoryManager.amountCanTrade({
                priceKey: match.sku,
                tradeIntent: 'selling'
            })}`;
        }

        reply += '. ';

        if (match.autoprice && this.bot.isAdmin(steamID)) {
            reply += ` (price last updated ${dayjs.unix(match.time).fromNow()})`;
        }

        this.bot.sendMessage(steamID, reply);
    };
}
