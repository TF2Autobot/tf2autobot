import SteamID from 'steamid';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';

export default class QueueCommand implements ICommand {
    name = 'queue';

    description = 'Check your position in the queue\n\n✨=== Contact Owner ===✨';

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
    };
}
