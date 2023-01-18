import SteamID from 'steamid';
import CommandHandler, { CraftUncraft, ICommand } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';

export default class CraftingCommand implements ICommand {
    name = 'craftweapon';

    aliases = ['craftweapons', 'uncraftweapon', 'uncraftweapons'];

    description = '';

    isAdminCommand = true;

    constructor(
        public readonly bot: Bot,
        public readonly pricer: IPricer,
        public readonly commandHandler: CommandHandler
    ) {
        this.bot = bot;
        this.pricer = pricer;
        this.commandHandler = commandHandler;
    }

    // I don't like this approach, and better to remove this aliases and turn them into specific commands
    // In their own classes
    execute = (steamID: SteamID, message: string, command) => {
        void this.commandHandler.misc.weaponCommand(
            steamID,
            command === 'craftweapons'
                ? 'craftweapon'
                : command === 'uncraftweapons'
                ? 'uncraftweapon'
                : (command as CraftUncraft)
        );
    };
}
