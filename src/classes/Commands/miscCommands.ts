import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import moment from 'moment-timezone';

import { craftWeapons, uncraftWeapons } from './utils';

import Bot from '../Bot';
import MyHandler from '../MyHandler';

import { pure, timeNow } from '../../lib/tools/export';

export function timeCommand(steamID: SteamID, bot: Bot): void {
    const timeWithEmojis = timeNow(bot.options.timezone, bot.options.timezone, bot.options.timeAdditionalNotes);
    bot.sendMessage(
        steamID,
        `It is currently the following time in my owner's timezone: ${timeWithEmojis.emoji} ${timeWithEmojis.time +
            (timeWithEmojis.note !== '' ? `. ${timeWithEmojis.note}.` : '.')}`
    );
}

export function uptimeCommand(steamID: SteamID, bot: Bot): void {
    const uptime = (bot.handler as MyHandler).getUptime();

    const currentTime = moment();
    const uptimeAsMoment = moment.unix(uptime);
    const hoursDiff = currentTime.diff(uptimeAsMoment, 'hours');
    const daysDiff = currentTime.diff(uptimeAsMoment, 'days');

    // If the bot has been up for ~1 day, show the exact amount of hours
    // If the bot has been up for ~1 month, show the exact amount of days
    // Otherwise, show the uptime as it is
    if (hoursDiff >= 21.5 && hoursDiff < 35.5) {
        bot.sendMessage(steamID, `Bot has been up for a day (${hoursDiff} hours).`);
    } else if (daysDiff >= 25.5) {
        bot.sendMessage(steamID, `Bot has been up for a month (${daysDiff} days).`);
    } else {
        bot.sendMessage(steamID, `Bot has been up for ${uptimeAsMoment.from(currentTime, true)}.`);
    }
}

export function pureCommand(steamID: SteamID, bot: Bot): void {
    const pureStock = pure.stock(bot);

    bot.sendMessage(steamID, `💰 I have ${pureStock.join(' and ')} in my inventory.`);
}

export function rateCommand(steamID: SteamID, bot: Bot): void {
    const key = bot.pricelist.getKeyPrices();
    const keyPrice = key.sell.toString();
    const keyRateSource = key.src;

    bot.sendMessage(
        steamID,
        'I value 🔑 Mann Co. Supply Crate Keys at ' +
            keyPrice +
            '. This means that one key is the same as ' +
            keyPrice +
            ', and ' +
            keyPrice +
            ' is the same as one key.' +
            `\n\nKey rate source: ${
                keyRateSource === 'manual' ? 'manual' : 'https://api.prices.tf/items/5021;6?src=bptf'
            }`
    );
}

export function stockCommand(steamID: SteamID, bot: Bot): void {
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

    bot.sendMessage(steamID, reply);
}

export function craftweaponCommand(steamID: SteamID, bot: Bot): void {
    const crafWeaponStock = craftWeapons(bot);

    let reply: string;
    if (crafWeaponStock.length > 0) {
        reply = "📃 Here's a list of all craft weapons stock in my inventory:\n\n" + crafWeaponStock.join(', \n');
    } else {
        reply = "❌ I don't have any craftable weapons in my inventory.";
    }
    bot.sendMessage(steamID, reply);
}

export function uncraftweaponCommand(steamID: SteamID, bot: Bot): void {
    const uncrafWeaponStock = uncraftWeapons(bot);

    let reply: string;
    if (uncrafWeaponStock.length > 0) {
        reply = "📃 Here's a list of all uncraft weapons stock in my inventory:\n\n" + uncrafWeaponStock.join(', \n');
    } else {
        reply = "❌ I don't have any uncraftable weapons in my inventory.";
    }
    bot.sendMessage(steamID, reply);
}

export function ownerCommand(steamID: SteamID, bot: Bot): void {
    if (!bot.options.enableOwnerCommand) {
        bot.sendMessage(steamID, '❌ This command is disabled by the owner.');
        return;
    }
    const admins = bot.getAdmins();
    const firstAdmin = admins[0];

    bot.sendMessage(
        steamID,
        `• Steam: https://steamcommunity.com/profiles/${firstAdmin.toString()}` +
            `\n• Backpack.tf: https://backpack.tf/profiles/${firstAdmin.toString()}`
    );
}

export function discordCommand(steamID: SteamID, bot: Bot): void {
    let reply = '';
    if (bot.options.discordInviteLink) {
        reply += `TF2Autobot Discord Server: https://discord.gg/ZrVT7mc\nOwner's Discord Server: ${bot.options.discordInviteLink}`;
    } else {
        reply += 'TF2Autobot Discord Server: https://discord.gg/ZrVT7mc';
    }

    bot.sendMessage(steamID, reply);
}
