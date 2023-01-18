import SteamID from 'steamid';
import SKU from '@tf2autobot/tf2-sku';
import CommandHandler, { ICommand } from '../../CommandHandler';
import Bot from '../../../Bot';
import IPricer from '../../../IPricer';
import CommandParser from '../../../CommandParser';
import { removeLinkProtocol } from '../../functions/utils';
import testPriceKey from '../../../../lib/tools/testPriceKey';

export default class SkuCommand implements ICommand {
    name = 'sku';

    description = 'Get the sku of an item.';

    usage = `<Full Item Name|Item's sku>`;

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
        const itemNamesOrSkus = CommandParser.removeCommand(removeLinkProtocol(message));

        if (itemNamesOrSkus === '!sku') {
            return this.bot.sendMessage(steamID, `❌ Missing item name or item sku!`);
        }

        const itemsOrSkus = itemNamesOrSkus.split('\n');

        if (itemsOrSkus.length === 1) {
            if (!testPriceKey(itemNamesOrSkus)) {
                // Receive name
                const sku = this.bot.schema.getSkuFromName(itemNamesOrSkus);

                if (sku.includes('null') || sku.includes('undefined')) {
                    return this.bot.sendMessage(
                        steamID,
                        `Generated sku: ${sku}\nPlease check the name. If correct, please let us know. Thank you.`
                    );
                }

                this.bot.sendMessage(steamID, `• ${sku}\nhttps://autobot.tf/items/${sku}`);
            } else {
                // Receive sku
                const name = this.bot.schema.getName(SKU.fromString(itemNamesOrSkus), false);
                this.bot.sendMessage(steamID, `• ${name}\nhttps://autobot.tf/items/${itemNamesOrSkus}`);
            }
        } else {
            const results: { source: string; generated: string }[] = [];
            itemsOrSkus.forEach(item => {
                if (!testPriceKey(item)) {
                    // Receive name
                    results.push({ source: item, generated: this.bot.schema.getSkuFromName(item) });
                } else {
                    results.push({ source: item, generated: this.bot.schema.getName(SKU.fromString(item), false) });
                }
            });

            this.bot.sendMessage(
                steamID,
                `• ${results.map(item => `${item.source} => ${item.generated}`).join('\n• ')}`
            );
        }
    };
}
