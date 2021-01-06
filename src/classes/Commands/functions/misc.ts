import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';

import { craftWeapons, uncraftWeapons } from './utils';

import Bot from '../../Bot';

import { pure, timeNow, uptime } from '../../../lib/tools/export';

export function timeCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options;
    const opt2 = opt.commands.time;

    if (!opt2.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt2.customReply.disabled;

            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const custom = opt2.customReply.reply;

    const timeWithEmojis = timeNow(opt.timezone, opt.customTimeFormat, opt.timeAdditionalNotes);
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
}

export function uptimeCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.uptime;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const botUptime = uptime();
    const custom = opt.customReply.reply;

    bot.sendMessage(steamID, custom ? custom.replace(/%uptime%/g, botUptime) : botUptime);
}

export function pureCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.pure;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const pureStock = pure.stock(bot);
    const custom = opt.customReply.reply;

    bot.sendMessage(
        steamID,
        custom
            ? custom.replace(/%pure%/g, pureStock.join(' and '))
            : `💰 I have ${pureStock.join(' and ')} in my inventory.`
    );
}

export function rateCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.rate;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const key = bot.pricelist.getKeyPrices;
    const keyPrice = key.sell.toString();
    const keyRateSource = key.src;

    const custom = opt.customReply.reply;
    const source = keyRateSource === 'manual' ? 'manual' : 'https://api.prices.tf/items/5021;6?src=bptf';

    bot.sendMessage(
        steamID,
        custom
            ? custom
                  .replace(/%keyprice%/g, keyPrice)
                  .replace(/%keyrate%/g, `${key.buy.metal} / ${key.sell.toString()}`)
                  .replace(/%source%/g, source)
            : 'I value 🔑 Mann Co. Supply Crate Keys at ' +
                  keyPrice +
                  '. This means that one key is the same as ' +
                  keyPrice +
                  ', and ' +
                  keyPrice +
                  ' is the same as one key.' +
                  `\n\nKey rate source: ${source}`
    );
}

export function stockCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.stock;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const dict = bot.inventoryManager.getInventory().getItems();

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
            amount: bot.inventoryManager.getInventory().getAmount('5021;6')
        },
        {
            name: 'Refined Metal',
            amount: bot.inventoryManager.getInventory().getAmount('5002;6')
        },
        {
            name: 'Reclaimed Metal',
            amount: bot.inventoryManager.getInventory().getAmount('5001;6')
        },
        {
            name: 'Scrap Metal',
            amount: bot.inventoryManager.getInventory().getAmount('5000;6')
        }
    ];

    const parsed = pure.concat(items);

    const stock: string[] = [];
    let left = 0;

    const max = opt.maximumItems;

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

export function craftweaponCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.craftweapon;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const crafWeaponStock = craftWeapons(bot);

    let reply: string;
    if (crafWeaponStock.length > 0) {
        const custom = opt.customReply.have;
        reply = custom
            ? custom.replace(/%list%/g, crafWeaponStock.join(', \n'))
            : "📃 Here's a list of all craft weapons stock in my inventory:\n\n" + crafWeaponStock.join(', \n');
    } else {
        const custom = opt.customReply.dontHave;
        reply = custom ? custom : "❌ I don't have any craftable weapons in my inventory.";
    }

    bot.sendMessage(steamID, reply);
}

export function uncraftweaponCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.uncraftweapon;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const uncrafWeaponStock = uncraftWeapons(bot);

    let reply: string;

    if (uncrafWeaponStock.length > 0) {
        const custom = opt.customReply.have;
        reply = custom
            ? custom.replace(/%list/g, uncrafWeaponStock.join(', \n'))
            : "📃 Here's a list of all uncraft weapons stock in my inventory:\n\n" + uncrafWeaponStock.join(', \n');
    } else {
        const custom = opt.customReply.dontHave;
        reply = custom ? custom : "❌ I don't have any uncraftable weapons in my inventory.";
    }

    bot.sendMessage(steamID, reply);
}

export function ownerCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.owner;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const admins = bot.getAdmins();
    const firstAdmin = admins[0];

    const custom = opt.customReply.reply;
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
}

export function discordCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.discord;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;
            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    let reply = '';

    const custom = opt.customReply.reply;
    const inviteURL = bot.options.commands.discord.inviteURL;

    if (custom) {
        reply +=
            'TF2Autobot Discord Server: https://discord.gg/ZrVT7mc\n\n' + custom.replace(/%discordurl%/g, inviteURL);
    } else {
        if (inviteURL) {
            reply += `TF2Autobot Discord Server: https://discord.gg/ZrVT7mc\nOwner's Discord Server: ${inviteURL}`;
        } else {
            reply += 'TF2Autobot Discord Server: https://discord.gg/ZrVT7mc';
        }
    }

    bot.sendMessage(steamID, reply);
}
