import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';

import Bot from '../../Bot';

import { craftAll, uncraftAll } from '../../../lib/data';
import { pure, timeNow, uptime } from '../../../lib/tools/export';

export function timeCommand(steamID: SteamID, bot: Bot): void {
    const opt = bot.options.commands.time;

    if (!opt.enable) {
        if (!bot.isAdmin(steamID)) {
            const custom = opt.customReply.disabled;

            bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            return;
        }
    }

    const custom = opt.customReply.reply;

    const timeWithEmojis = timeNow(bot);
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

    const keyPrices = bot.pricelist.getKeyPrices;
    const keyRateSource = keyPrices.src;

    const custom = opt.customReply.reply;
    const source = keyRateSource === 'manual' ? 'manual' : 'https://api.prices.tf/items/5021;6?src=bptf';

    bot.sendMessage(
        steamID,
        custom
            ? custom
                  .replace(/%keypriceSell%/g, keyPrices.sell.toString())
                  .replace(/%keypriceBuy%/g, keyPrices.buy.toString())
                  .replace(/%keyrate%/g, `${keyPrices.buy.metal} / ${keyPrices.sell.toString()}`)
                  .replace(/%source%/g, source)
            : 'I value 🔑 Mann Co. Supply Crate Keys at ' +
                  `${keyPrices.buy.toString()} when I am buying, and ${keyPrices.sell.toString()} when I am selling.` +
                  '\n\nIn other words,' +
                  `\n• Whenever I am buying stuff from you, if the trade involves Mann Co. Supply Crate Key,` +
                  ` I will use ${keyPrices.buy.toString()} as my conversion rate.` +
                  `\n• Whenever I am selling stuff to you, if the trade involves Mann Co. Supply Crate Key,` +
                  ` I will use ${keyPrices.sell.toString()} as my conversion rate.` +
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

    const craftWeapons = (bot: Bot) => {
        const items: { amount: number; name: string }[] = [];

        craftAll.forEach(sku => {
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

        const craftWeaponsStock: string[] = [];

        if (items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                craftWeaponsStock.push(`${items[i].name}: ${items[i].amount}`);
            }
        }
        return craftWeaponsStock;
    };

    const craftWeaponStock = craftWeapons(bot);

    let reply: string;
    if (craftWeaponStock.length > 0) {
        const custom = opt.customReply.have;
        reply = custom
            ? custom.replace(/%list%/g, craftWeaponStock.join(', \n'))
            : "📃 Here's a list of all craft weapons stock in my inventory:\n\n" + craftWeaponStock.join(', \n');
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

    const uncraftWeapons = (bot: Bot) => {
        const items: { amount: number; name: string }[] = [];

        uncraftAll.forEach(sku => {
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

        const uncraftWeaponsStock: string[] = [];

        if (items.length > 0) {
            for (let i = 0; i < items.length; i++) {
                uncraftWeaponsStock.push(`${items[i].name}: ${items[i].amount}`);
            }
        }
        return uncraftWeaponsStock;
    };

    const uncraftWeaponStock = uncraftWeapons(bot);

    let reply: string;

    if (uncraftWeaponStock.length > 0) {
        const custom = opt.customReply.have;
        reply = custom
            ? custom.replace(/%list/g, uncraftWeaponStock.join(', \n'))
            : "📃 Here's a list of all uncraft weapons stock in my inventory:\n\n" + uncraftWeaponStock.join(', \n');
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

    const firstAdmin = bot.getAdmins[0];

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

    let reply: string;

    const custom = opt.customReply.reply;
    const inviteURL = opt.inviteURL;

    if (custom) {
        reply =
            'TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8\n\n' + custom.replace(/%discordurl%/g, inviteURL);
    } else {
        if (inviteURL) {
            reply = `TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8\nOwner's Discord Server: ${inviteURL}`;
        } else {
            reply = 'TF2Autobot Discord Server: https://discord.gg/D2GNnp7tv8';
        }
    }

    bot.sendMessage(steamID, reply);
}
