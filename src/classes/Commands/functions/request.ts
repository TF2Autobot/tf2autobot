import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import dayjs from 'dayjs';
import sleepasync from 'sleep-async';
import Currencies from 'tf2-currencies';
import { removeLinkProtocol, getItemFromParams, testSKU } from './utils';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import log from '../../../lib/logger';
import { fixItem } from '../../../lib/items';
import { getSales, GetItemSalesResponse, requestCheck, getPrice, RequestCheckResponse } from '../../../lib/ptf-api';

export async function getSalesCommand(steamID: SteamID, message: string, bot: Bot): Promise<void> {
    const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
    if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);

        if (item === null) {
            return bot.sendMessage(steamID, `❌ Item not found.`);
        }

        params.sku = SKU.fromObject(item);
    } else {
        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), bot.schema));
    }

    const name = bot.schema.getName(SKU.fromString(params.sku));
    try {
        const salesData: GetItemSalesResponse = await getSales(params.sku, 'bptf');
        if (!salesData) {
            return bot.sendMessage(
                steamID,
                `❌ No recorded snapshots found for ${name === null ? (params.sku as string) : name}.`
            );
        }

        if (salesData.sales.length === 0) {
            return bot.sendMessage(
                steamID,
                `❌ No recorded snapshots found for ${name === null ? (params.sku as string) : name}.`
            );
        }

        const sales: Sales[] = [];
        salesData.sales.forEach(sale =>
            sales.push({
                seller: 'https://backpack.tf/profiles/' + sale.steamid,
                itemHistory: 'https://backpack.tf/item/' + sale.id.replace('440_', ''),
                keys: sale.currencies.keys,
                metal: sale.currencies.metal,
                date: sale.time
            })
        );
        sales.sort((a, b) => b.date - a.date);

        let left = 0;
        const SalesList: string[] = [];
        for (let i = 0; i < sales.length; i++) {
            if (SalesList.length > 40) {
                left += 1;
            } else {
                SalesList.push(
                    `Listed #${i + 1}-----\n• Date: ${dayjs.unix(sales[i].date).utc().toString()}\n• Item: ${
                        sales[i].itemHistory
                    }\n• Seller: ${sales[i].seller}\n• Was selling for: ${
                        sales[i].keys > 0 ? `${sales[i].keys} keys,` : ''
                    } ${sales[i].metal} ref`
                );
            }
        }

        let reply = `🔎 Recorded removed sell listings from backpack.tf\n\nItem name: ${
            salesData.name
        }\n\n-----${SalesList.join('\n\n-----')}`;
        if (left > 0) {
            reply += `,\n\nand ${left} other ${pluralize('sale', left)}`;
        }

        bot.sendMessage(steamID, reply);
    } catch (err) {
        return bot.sendMessage(
            steamID,
            `❌ Error getting sell snapshots for ${name === null ? (params.sku as string) : name}: ${JSON.stringify(
                err
            )}`
        );
    }
}

// Request commands

export function pricecheckCommand(steamID: SteamID, message: string, bot: Bot): void {
    const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        return bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
    }

    if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);
        if (item === null) {
            return bot.sendMessage(steamID, `❌ Item not found.`);
        }

        params.sku = SKU.fromObject(item);
    } else {
        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), bot.schema));
    }

    const name = bot.schema.getName(SKU.fromString(params.sku), false);
    void requestCheck(params.sku, 'bptf').asCallback((err, body: RequestCheckResponse) => {
        if (err) {
            return bot.sendMessage(steamID, `❌ Error while requesting price check: ${JSON.stringify(err)}`);
        }

        if (!body) {
            bot.sendMessage(steamID, '❌ Error while requesting price check (returned null/undefined)');
        } else {
            bot.sendMessage(
                steamID,
                `⌛ Price check requested for ${
                    body.name.includes('War Paint') ||
                    body.name.includes('Mann Co. Supply Crate Series #') ||
                    body.name.includes('Salvaged Mann Co. Supply Crate #')
                        ? name
                        : body.name
                }, the item will be checked.`
            );
        }
    });
}

export async function pricecheckAllCommand(steamID: SteamID, bot: Bot): Promise<void> {
    const pricelist = bot.pricelist.getPrices;

    const total = pricelist.length;
    const totalTime = total * 2 * 1000;
    const aSecond = 1 * 1000;
    const aMin = 1 * 60 * 1000;
    const anHour = 1 * 60 * 60 * 1000;
    bot.sendMessage(
        steamID,
        `⌛ Price check requested for ${total} items. It will be completed in approximately ${
            totalTime < aMin
                ? `${Math.round(totalTime / aSecond)} seconds.`
                : totalTime < anHour
                ? `${Math.round(totalTime / aMin)} minutes.`
                : `${Math.round(totalTime / anHour)} hours.`
        } (about 2 seconds for each item).`
    );

    const skus = pricelist.map(entry => entry.sku);
    let submitted = 0;
    let success = 0;
    let failed = 0;
    for (const sku of skus) {
        await sleepasync().Promise.sleep(2 * 1000);
        void requestCheck(sku, 'bptf').asCallback(err => {
            if (err) {
                submitted++;
                failed++;
                log.warn(`pricecheck failed for ${sku}: ${JSON.stringify(err)}`);
                log.debug(
                    `pricecheck for ${sku} failed, status: ${submitted}/${total}, ${success} success, ${failed} failed.`
                );
            } else {
                submitted++;
                success++;
                log.debug(
                    `pricecheck for ${sku} success, status: ${submitted}/${total}, ${success} success, ${failed} failed.`
                );
            }
            if (submitted === total) {
                bot.sendMessage(
                    steamID,
                    `✅ Successfully completed pricecheck for all ${total} ${pluralize('item', total)}!`
                );
            }
        });
    }
}

export async function checkCommand(steamID: SteamID, message: string, bot: Bot): Promise<void> {
    const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
    if (params.sku !== undefined && !testSKU(params.sku as string)) {
        return bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
    }

    if (params.sku === undefined) {
        const item = getItemFromParams(steamID, params, bot);
        if (item === null) {
            return bot.sendMessage(steamID, `❌ Item not found.`);
        }

        params.sku = SKU.fromObject(item);
    } else {
        params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), bot.schema));
    }

    const name = bot.schema.getName(SKU.fromString(params.sku));
    try {
        const price = await getPrice(params.sku, 'bptf');
        const currBuy = new Currencies(price.buy);
        const currSell = new Currencies(price.sell);

        bot.sendMessage(
            steamID,
            `🔎 ${name}:\n• Buy  : ${currBuy.toString()}\n• Sell : ${currSell.toString()}\n\nPrices.TF: https://prices.tf/items/${
                params.sku as string
            }`
        );
    } catch (err) {
        return bot.sendMessage(
            steamID,
            `Error getting price for ${name === null ? (params.sku as string) : name}: ${JSON.stringify(err)}`
        );
    }
}

interface Sales {
    seller: string;
    itemHistory: string;
    keys: number;
    metal: number;
    date: number;
}
