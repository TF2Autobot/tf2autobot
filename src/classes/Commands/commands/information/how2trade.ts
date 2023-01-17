import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';

export default class How2TradeCommand implements ICommand {
    name = 'how2trade';

    description = 'Guide on how to trade with the bot.';

    constructor(
        public readonly bot: Bot,
        public readonly pricer: IPricer,
        public readonly commandHandler: CommandHandler
    ) {
        this.bot = bot;
        this.pricer = pricer;
        this.commandHandler = commandHandler;
    }

    execute = (steamID: SteamID, message: string): void => {
        const custom = this.bot.options.commands.how2trade.customReply.reply;
        const prefix = this.bot.getPrefix(steamID);
        this.bot.sendMessage(
            steamID,
            custom
                ? custom
                : '/quote You can either send me an offer yourself, or use one of my commands to request a trade. ' +
                      `Say you want to buy a Team Captain, just type "${prefix}buy Team Captain", if want to buy more, ` +
                      `just add the [amount] - "${prefix}buy 2 Team Captain". Type "${prefix}help" for all the commands.` +
                      `\nYou can also buy or sell multiple items by using the "${prefix}buycart [amount] <item name>" or ` +
                      `"${prefix}sellcart [amount] <item name>" commands.`
        );
    };
}
