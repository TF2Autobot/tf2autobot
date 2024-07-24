import SteamID from 'steamid';
import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import * as timersPromises from 'timers/promises';
import { Message as DiscordMessage } from 'discord.js';
import { removeLinkProtocol } from '../functions/utils';
import CommandParser from '../../CommandParser';
import Bot from '../../Bot';
import { Discord, Stock } from '../../Options';
import { pure, timeNow, uptime, testPriceKey } from '../../../lib/tools/export';
import getAttachmentName from '../../../lib/tools/getAttachmentName';

type Misc = 'time' | 'uptime' | 'pure' | 'rate' | 'owner' | 'discord' | 'stock';
type CraftUncraft = 'craftweapon' | 'uncraftweapon';

export default class MiscCommands {
    constructor(private readonly bot: Bot) {
        this.bot = bot;
    }

    links(steamID: SteamID): void {
        const botSteamID = this.bot.client.steamID.getSteamID64();

        this.bot.sendMessage(
            steamID,
            `Steam: <https://steamcommunity.com/profiles/${botSteamID}>` +
                `\nBackpack.tf: <https://backpack.tf/u/${botSteamID}>` +
                `\nRep.tf: <https://rep.tf/${botSteamID}>` +
                `\nTrade Offer URL: <${this.bot.tradeOfferUrl}>`
        );
    }

    miscCommand(steamID: SteamID, command: Misc, message?: string): void {
        const opt = this.bot.options.commands[command];
        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const custom = opt.customReply.reply;
        if (command === 'time') {
            const timeWithEmojis = timeNow(this.bot.options);
            this.bot.sendMessage(
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
            this.bot.sendMessage(steamID, custom ? custom.replace(/%uptime%/g, botUptime) : botUptime);
        } else if (command === 'pure') {
            const pureStock = pure.stock(this.bot);
            this.bot.sendMessage(
                steamID,
                custom
                    ? custom.replace(/%pure%/g, pureStock.join(' and '))
                    : `💰 I have ${pureStock.join(' and ')} in my inventory.`
            );
        } else if (command === 'rate') {
            const key = this.bot.pricelist.getKeyPrices;
            const keySellRate = key.sell.toString();
            const keyBuyRate = key.buy.toString();

            this.bot.sendMessage(
                steamID,
                custom
                    ? custom
                          .replace(/%keySellRate%/g, keySellRate)
                          .replace(/%keyBuyRate%/g, keyBuyRate)
                          .replace(/%keyPrices%/g, `${keyBuyRate} / ${keySellRate}`)
                    : 'I value 🔑 Mann Co. Supply Crate Keys at ' +
                          `${keyBuyRate} / ${keySellRate}` +
                          '. This means that I buy one key for ' +
                          keyBuyRate +
                          ', and I sell one key for ' +
                          keySellRate +
                          '.'
            );
        } else if (command === 'owner') {
            const firstAdmin = this.bot.getAdmins[0];
            const steamURL = `https://steamcommunity.com/profiles/${firstAdmin.toString()}`;
            const bptfURL = `https://backpack.tf/profiles/${firstAdmin.toString()}`;

            this.bot.sendMessage(
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
                reply = custom.replace(/%discordurl%/g, inviteURL);
            } else {
                if (inviteURL) {
                    reply = `Owner's Discord Server: ${inviteURL}`;
                    //
                } else return this.bot.sendMessage(steamID, '❌ The owner have not set the Discord invite link.');
            }
            this.bot.sendMessage(steamID, reply);
        } else {
            const itemNameOrSku = CommandParser.removeCommand(removeLinkProtocol(message));
            let reply = '';

            if (itemNameOrSku !== '!sku') {
                // I don't remember why not `!sku` here.
                let sku: string = itemNameOrSku;
                if (itemNameOrSku !== '!stock') {
                    if (!testPriceKey(itemNameOrSku)) {
                        // Receive name
                        sku = this.bot.schema.getSkuFromName(itemNameOrSku);

                        if (sku.includes('null') || sku.includes('undefined')) {
                            return this.bot.sendMessage(
                                steamID,
                                `/pre ❌ Generated sku: ${sku}\nPlease check the name. If correct, please let us know. Thank you.`
                            );
                        }
                    }

                    const itemDicts = this.bot.inventoryManager.getInventory.getItems[sku] ?? [];
                    const name = this.bot.schema.getName(SKU.fromString(sku), false);

                    reply = `/pre I currently have ${itemDicts.length} of ${name} (${sku}).`;

                    const assetids: string[] = [];
                    if (itemDicts.length > 0) {
                        itemDicts.forEach(item => {
                            const hv: { [id: string]: string[] } = {};
                            if (item.hv) {
                                Object.keys(item.hv).forEach(attachment => {
                                    for (const pSku in item.hv[attachment]) {
                                        if (!Object.prototype.hasOwnProperty.call(item.hv[attachment], pSku)) {
                                            continue;
                                        }

                                        const hvName = getAttachmentName(
                                            attachment,
                                            pSku,
                                            this.bot.schema.paints,
                                            this.bot.strangeParts
                                        );

                                        if (hv[item.id] === undefined) {
                                            hv[item.id] = [];
                                        }

                                        hv[item.id].push(hvName);
                                    }
                                });
                            }

                            assetids.push(`${item.id}${hv[item.id]?.length > 0 ? ` (${hv[item.id].join(', ')})` : ''}`);
                        });
                    }

                    reply += assetids.length > 0 ? '\n\nAssetids:\n- ' + assetids.join('\n- ') : '';
                    return this.bot.sendMessage(steamID, reply);
                }
            }

            const inventory = this.bot.inventoryManager.getInventory;
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
                    name: this.bot.schema.getName(SKU.fromString(sku), false),
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
                const diff = b.amount - a.amount;
                return diff;
            });

            const pure = [
                {
                    name: 'Mann Co. Supply Crate Key',
                    amount: inventory.getAmount({ priceKey: '5021;6', includeNonNormalized: false })
                },
                {
                    name: 'Refined Metal',
                    amount: inventory.getAmount({ priceKey: '5002;6', includeNonNormalized: false })
                },
                {
                    name: 'Reclaimed Metal',
                    amount: inventory.getAmount({ priceKey: '5001;6', includeNonNormalized: false })
                },
                {
                    name: 'Scrap Metal',
                    amount: inventory.getAmount({ priceKey: '5000;6', includeNonNormalized: false })
                }
            ];

            const parsed = pure.concat(items);

            const stock: string[] = [];
            let left = 0;

            const max = (opt as Stock).maximumItems;

            const parsedCount = parsed.length;

            for (let i = 0; i < parsedCount; i++) {
                if (stock.length > max) {
                    left += parsed[i].amount;
                } else {
                    stock.push(`${parsed[i].name}: ${parsed[i].amount}`);
                }
            }

            const custom = opt.customReply.reply;
            reply += custom
                ? custom.replace(/%stocklist%/g, stock.join(', \n'))
                : `${
                      steamID.redirectAnswerTo instanceof DiscordMessage ? '/pre2' : '/pre '
                  }📜 Here's a list of all the items that I have in my inventory:\n${stock.join(', \n')}`;

            if (left > 0) {
                reply += `,\nand ${left} other ${pluralize('item', left)}`;
            }

            this.bot.sendMessage(steamID, reply);
        }
    }

    async weaponCommand(steamID: SteamID, type: CraftUncraft): Promise<void> {
        const opt = this.bot.options.commands[type];
        if (!opt.enable) {
            if (!this.bot.isAdmin(steamID)) {
                const custom = opt.customReply.disabled;
                return this.bot.sendMessage(steamID, custom ? custom : '❌ This command is disabled by the owner.');
            }
        }

        const weaponStock = this.getWeaponsStock(
            opt.showOnlyExist,
            type === 'craftweapon' ? this.bot.craftWeapons : this.bot.uncraftWeapons
        );

        let reply: string;
        if (weaponStock.length > 15) {
            const custom = opt.customReply.have;

            reply = custom
                ? custom.replace(/%list%/g, '')
                : `📃 Here's a list of all ${
                      type === 'craftweapon' ? 'craft' : 'uncraft'
                  } weapons stock in my inventory:\n\n`;

            this.bot.sendMessage(steamID, reply);

            const listCount = weaponStock.length;
            const limit = 15;
            const loops = Math.ceil(listCount / 15);

            for (let i = 0; i < loops; i++) {
                const last = loops - i === 1;
                const i15 = i * 15;

                const firstOrLast = i < 1 ? limit : i15 + (listCount - i15);

                this.bot.sendMessage(steamID, weaponStock.slice(i15, last ? firstOrLast : (i + 1) * 15).join('\n'));

                await timersPromises.setTimeout(3000);
            }

            return;
        } else if (weaponStock.length > 0) {
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
                : `❌ I don't have any ${
                      type === 'craftweapon' ? 'craftable' : 'uncraftable'
                  } weapons in my inventory.`;
        }

        this.bot.sendMessage(steamID, reply);
    }

    paintsCommand(steamID: SteamID): void {
        this.bot.sendMessage(
            steamID,
            '/code ' +
                JSON.stringify(
                    Object.keys(this.bot.schema.paints).reduce((obj, name) => {
                        obj[name] = `p${this.bot.schema.paints[name]}`;
                        return obj;
                    }, {}),
                    null,
                    4
                )
        );
    }

    private getWeaponsStock(showOnlyExist: boolean, weapons: string[]): string[] {
        const items: { amount: number; name: string }[] = [];
        const inventory = this.bot.inventoryManager.getInventory;

        if (showOnlyExist) {
            weapons.forEach(sku => {
                const amount = inventory.getAmount({ priceKey: sku, includeNonNormalized: false });
                if (amount > 0) {
                    items.push({
                        name: this.bot.schema.getName(SKU.fromString(sku), false),
                        amount: amount
                    });
                }
            });
        } else {
            weapons.forEach(sku => {
                const amount = inventory.getAmount({ priceKey: sku, includeNonNormalized: false });
                items.push({
                    name: this.bot.schema.getName(SKU.fromString(sku), false),
                    amount: amount
                });
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
            const diff = b.amount - a.amount;
            return diff;
        });

        const stock: string[] = [];
        const itemsCount = items.length;

        if (itemsCount > 0) {
            for (let i = 0; i < itemsCount; i++) {
                stock.push(`${items[i].name}: ${items[i].amount}`);
            }
        }
        return stock;
    }
}
