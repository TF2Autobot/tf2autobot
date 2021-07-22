import SteamID from 'steamid';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';

export default class CraftingCommands {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    craftTokenCommand(steamID: SteamID, message: string): void {
        const opt = this.bot.options.crafting;
        if (opt.manual === false) {
            return this.bot.sendMessage(
                steamID,
                '❌ Please set crafting.manual option to false in order to use this command.'
            );
        }

        message = CommandParser.removeCommand(message).trim();
        const parts = message.toLowerCase().split(' ');
        // !craftToken <tokenType (class/slot)> <subTokenType (scout, soldier, etc)> <amount>

        if (parts.length < 3) {
            return this.bot.sendMessage(
                steamID,
                '❌ Wrong syntax. Correct syntax: !craftToken <tokenType> <subTokenType> <amount>' +
                    '\n - tokenType: "class" or "slot"' +
                    '\n - subTokenType: one of the 9 TF2 class characters if TokenType is class, or "primary"/"secondary"/"melee"/"pda" if TokenType is slot' +
                    '\n - amount: Must be an integer'
            );
        }

        const tokenType = parts[0];
        const subTokenType = parts[1];
        const amount = parseInt(parts[2]);

        if (isNaN(amount)) {
            return this.bot.sendMessage(steamID, '❌ Amount must be type integer!');
        }

        if (!['class', 'slot'].includes(tokenType)) {
            return this.bot.sendMessage(steamID, '❌ tokenType must only be either "class" or "slot"!');
        }

        const classes = ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'];
        const slotType = ['primary', 'secondary', 'melee', 'pda'];

        if (tokenType === 'class' && !classes.includes(subTokenType)) {
            return this.bot.sendMessage(
                steamID,
                '❌ subTokenType must be one of 9 TF2 class character since your tokenType is class!'
            );
        } else if (tokenType === 'slot' && !slotType.includes(subTokenType)) {
            return this.bot.sendMessage(
                steamID,
                '❌ subTokenType must only be either "primary", "secondary", "melee", or "pda" since your tokenType is slot!'
            );
        }

        // To be continued
    }
}
