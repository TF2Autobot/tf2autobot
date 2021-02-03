import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import Bot from '../../Bot';
import { Discord, Stock } from '../../Options';
import { pure, timeNow, uptime } from '../../../lib/tools/export';

type Misc = 'time' | 'uptime' | 'pure' | 'rate' | 'owner' | 'discord' | 'stock';

export function miscCommand(steamID: SteamID, bot: Bot, command: Misc): void {
    const opt = bot.options.commands[command];
    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            return bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
        }
    }

    const custom = opt.customReply.reply;
    if (command === 'time') {
        const timeWithEmojis = timeNow(bot.options);
        bot.sendMessage(
            steamID,
            custom
                ? custom
                      .replace(/%emoji%/g, timeWithEmojis.emoji)
                      .replace(/%time%/g, timeWithEmojis.time)
                      .replace(/%note%/g, timeWithEmojis.note)
                : `It is currently the following time in my owner's timezone: ${timeWithEmojis.emoji} ${
                      timeWithEmojis.time + (timeWithEmojis.note !== '' ? `.\n\n${timeWithEmojis.note}.` : '.')
                  }`
        );
    } else if (command === 'uptime') {
        const botUptime = uptime();
        bot.sendMessage(steamID, custom ? custom.replace(/%uptime%/g, botUptime) : botUptime);
    } else if (command === 'pure') {
        const pureStock = pure.stock(bot);
        bot.sendMessage(
            steamID,
            custom
                ? custom.replace(/%pure%/g, pureStock.join(' and '))
                : `💰 I have ${pureStock.join(' and ')} in my inventory.`
        );
    } else if (command === 'rate') {
        const key = bot.pricelist.getKeyPrices;
        const keyRate = key.sell.toString();
        const source = key.src === 'manual' ? 'manual' : 'https://api.prices.tf/items/5021;6?src=bptf';

        bot.sendMessage(
            steamID,
            custom
                ? custom
                      .replace(/%keyRate%/g, keyRate)
                      .replace(/%keyPrices%/g, `${key.buy.metal} / ${key.sell.toString()}`)
                      .replace(/%source%/g, source)
                : 'I value 🔑 Mann Co. Supply Crate Keys at ' +
                      keyRate +
                      '. This means that one key is the same as ' +
                      keyRate +
                      ', and ' +
                      keyRate +
                      ' is the same as one key.' +
                      `\n\nKey rate source: ${source}`
        );
    } else if (command === 'owner') {
        const firstAdmin = bot.getAdmins[0];
        const steamURL = `https://steamcommunity.com/profiles/${firstAdmin.toString()}`;
        const bptfURL = `https://backpack.tf/profiles/${firstAdmin.toString()}`;

        bot.sendMessage(
            steamID,
            custom
                ? custom
                      .replace(/%steamurl%/g, steamURL)
                      .replace(/%bptfurl%/g, bptfURL)
                      .replace(/%steamid%/, firstAdmin.toString())
                : `• Steam: ${steamURL}\n• Backpack.tf: ${bptfURL}`
        );
    } else if (command === 'discord') {
        const inviteURL = (opt as Discord).inviteURL;
        let reply: string;
        if (custom) {
            reply =
                'TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8\n\n' +
                custom.replace(/%discordurl%/g, inviteURL);
        } else {
            if (inviteURL) {
                reply = `TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8\nOwner's Discord Server: ${inviteURL}`;
                //
            } else reply = 'TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8';
        }
        bot.sendMessage(steamID, reply);
    } else {
        const inventory = bot.inventoryManager.getInventory;
        const dict = inventory.getItems;
        const items: { amount: number; name: string }[] = [];

        for (const sku in dict) {
            if (!Object.prototype.hasOwnProperty.call(dict, sku)) {
                continue;
            }

            if (['5021;6', '5002;6', '5001;6', '5000;6'].includes(sku)) {
                continue;
            }

            items.push({
                name: bot.schema.getName(SKU.fromString(sku), false),
                amount: dict[sku].length
            });
        }

        items.sort((a, b) => {
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
                amount: inventory.getAmount('5021;6')
            },
            {
                name: 'Refined Metal',
                amount: inventory.getAmount('5002;6')
            },
            {
                name: 'Reclaimed Metal',
                amount: inventory.getAmount('5001;6')
            },
            {
                name: 'Scrap Metal',
                amount: inventory.getAmount('5000;6')
            }
        ];

        const parsed = pure.concat(items);

        const stock: string[] = [];
        let left = 0;

        const max = (opt as Stock).maximumItems;

        for (let i = 0; i < parsed.length; i++) {
            if (stock.length > max) {
                left += parsed[i].amount;
            } else {
                stock.push(`${parsed[i].name}: ${parsed[i].amount}`);
            }
        }

        const custom = opt.customReply.reply;
        let reply = custom
            ? custom.replace(/%stocklist%/g, stock.join(', \n'))
            : `/pre 📜 Here's a list of all the items that I have in my inventory:\n${stock.join(', \n')}`;

        if (left > 0) {
            reply += `,\nand ${left} other ${pluralize('item', left)}`;
        }

        bot.sendMessage(steamID, reply);
    }
}

type CraftUncraft = 'craftweapon' | 'uncraftweapon';

export function weaponCommand(steamID: SteamID, bot: Bot, type: CraftUncraft): void {
    const opt = bot.options.commands[type];
    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            return bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
        }
    }

    const weaponStock = getWeaponsStock(bot, type === 'craftweapon' ? bot.craftWeapons : bot.uncraftWeapons);

    let reply: string;
    if (weaponStock.length > 0) {
        const custom = opt.customReply.have;
        reply = custom
            ? custom.replace(/%list%/g, weaponStock.join(', \n'))
            : `📃 Here's a list of all ${
                  type === 'craftweapon' ? 'craft' : 'uncraft'
              } weapons stock in my inventory:\n\n` + weaponStock.join(', \n');
    } else {
        const custom = opt.customReply.dontHave;
        reply = custom
            ? custom
            : `❌ I don't have any ${type === 'craftweapon' ? 'craftable' : 'uncraftable'} weapons in my inventory.`;
    }

    bot.sendMessage(steamID, reply);
}

function getWeaponsStock(bot: Bot, type: string[]) {
    const items: { amount: number; name: string }[] = [];

    type.forEach(sku => {
        const amount = bot.inventoryManager.getInventory.getAmount(sku);
        if (amount > 0) {
            items.push({
                name: bot.schema.getName(SKU.fromString(sku), false),
                amount: amount
            });
        }
    });

    items.sort((a, b) => {
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

    const stock: string[] = [];

    if (items.length > 0) {
        for (let i = 0; i < items.length; i++) {
            stock.push(`${items[i].name}: ${items[i].amount}`);
        }
    }
    return stock;
}

export function paintsCommand(steamID: SteamID, bot: Bot): void {
    bot.sendMessage(steamID, '/code ' + JSON.stringify(bot.paints, null, 4));
}
