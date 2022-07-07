import SteamID from 'steamid';
import SKU from '@tf2autobot/tf2-sku';
import pluralize from 'pluralize';
import * as timersPromises from 'timers/promises';
import Currencies from '@tf2autobot/tf2-currencies';
import { removeLinkProtocol, getItemFromParams } from '../functions/utils';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import log from '../../../lib/logger';
import { fixItem } from '../../../lib/items';
import { testPriceKey } from '../../../lib/tools/export';
import { UnknownDictionary } from '../../../types/common';
import IPricer, { RequestCheckFn, RequestCheckResponse } from '../../IPricer';

export default class RequestCommands {
    constructor(private readonly bot: Bot, private priceSource: IPricer) {
        this.bot = bot;

        this.priceSource = priceSource;

        Pricecheck.setRequestCheckFn(this.priceSource.requestCheck.bind(this.priceSource));
    }

    pricecheckCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        let sku = params.sku as string;
        if (sku !== undefined && !testPriceKey(sku)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return;
            }

            sku = SKU.fromObject(item);
        } else {
            sku = SKU.fromObject(fixItem(SKU.fromString(sku), this.bot.schema));
        }

        void this.priceSource
            .requestCheck(sku)
            .then((body: RequestCheckResponse) => {
                if (!body) {
                    this.bot.sendMessage(steamID, '❌ Error while requesting price check (returned null/undefined)');
                } else {
                    let name: string;
                    if (body.name) {
                        name = body.name;
                    } else {
                        name = this.bot.schema.getName(SKU.fromString(sku));
                    }
                    this.bot.sendMessage(steamID, `✅ Requested pricecheck for ${name}, the item will be checked.`);
                }
            })
            .catch((err: ErrorRequest) => {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Error while requesting price check: ${
                        err.body && err.body.message ? err.body.message : err.message
                    }`
                );
            });
    }

    pricecheckAllCommand(steamID: SteamID): void {
        if (Pricecheck.isRunning()) {
            return this.bot.sendMessage(steamID, "❌ Pricecheck is still running. Please wait until it's completed.");
        }

        const pricelist = this.bot.pricelist.getPrices;
        const skus = Object.keys(pricelist).filter(sku => sku !== '5021;6');

        const total = skus.length;
        const totalTime = total * 2 * 1000;
        const aSecond = 1000;
        const aMin = 60 * 1000;
        const anHour = 60 * 60 * 1000;
        this.bot.sendMessage(
            steamID,
            `⌛ Price check requested for ${total} items. It will be completed in approximately ${
                totalTime < aMin
                    ? `${Math.round(totalTime / aSecond)} seconds.`
                    : totalTime < anHour
                    ? `${Math.round(totalTime / aMin)} minutes.`
                    : `${Math.round(totalTime / anHour)} hours.`
            } (about 2 seconds for each item).`
        );

        const pricecheck = new Pricecheck(this.bot, steamID);
        pricecheck.enqueue = skus;

        Pricecheck.addJob();
        void pricecheck.executeCheck();
    }

    async checkCommand(steamID: SteamID, message: string): Promise<void> {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        let sku = params.sku as string;
        if (sku !== undefined && !testPriceKey(sku)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return;
            }

            sku = SKU.fromObject(item);
        } else {
            sku = SKU.fromObject(fixItem(SKU.fromString(sku), this.bot.schema));
        }

        const name = this.bot.schema.getName(SKU.fromString(sku));
        try {
            const price = await this.priceSource.getPrice(sku);
            const currBuy = new Currencies(price.buy);
            const currSell = new Currencies(price.sell);

            this.bot.sendMessage(
                steamID,
                `🔎 ${name}:\n• Buy  : ${currBuy.toString()}\n• Sell : ${currSell.toString()}\nhttps://autobot.tf/items/${sku}`
            );
        } catch (err) {
            return this.bot.sendMessage(
                steamID,
                `Error getting price for ${name === null ? sku : name}: ${
                    (err as ErrorRequest).body && (err as ErrorRequest).body.message
                        ? (err as ErrorRequest).body.message
                        : (err as ErrorRequest).message
                }`
            );
        }
    }
}

class Pricecheck {
    // reference: https://www.youtube.com/watch?v=bK7I79hcm08

    private static pricecheck: UnknownDictionary<boolean> = {};

    private static requestCheck: RequestCheckFn;

    static setRequestCheckFn(fn: RequestCheckFn): void {
        this.requestCheck = fn;
    }

    private skus: string[] = [];

    private submitted = 0;

    private success = 0;

    private failed = 0;

    private total = 0;

    constructor(private readonly bot: Bot, private readonly steamID: SteamID) {
        this.bot = bot;
    }

    set enqueue(skus: string[]) {
        this.skus = skus;
        this.total = skus.length;
    }

    async executeCheck(): Promise<void> {
        await timersPromises.setTimeout(2000);

        void Pricecheck.requestCheck(this.sku)
            .then(() => {
                this.submitted++;
                this.success++;
                log.debug(
                    `pricecheck for ${this.sku} success, status: ${this.submitted}/${this.remaining}, ${this.success} success, ${this.failed} failed.`
                );
            })
            .catch(err => {
                this.submitted++;
                this.failed++;
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                log.warn(`pricecheck failed for ${this.sku}: ${errMessage}`);
                log.debug(
                    `pricecheck for ${this.sku} failed, status: ${this.submitted}/${this.remaining}, ${this.success} success, ${this.failed} failed.`
                );
            })
            .finally(() => {
                this.dequeue();

                if (this.isEmpty) {
                    Pricecheck.removeJob();
                    return this.bot.sendMessage(
                        this.steamID,
                        `✅ Successfully pricecheck for all ${this.total} ${pluralize('item', this.total)}!`
                    );
                }

                void this.executeCheck();
            });
    }

    private dequeue(): void {
        this.skus.shift();
    }

    private get sku(): string {
        return this.skus[0];
    }

    private get remaining(): number {
        return this.skus.length;
    }

    private get isEmpty(): boolean {
        return this.skus.length === 0;
    }

    static addJob(): void {
        this.pricecheck['1'] = true;
    }

    static isRunning(): boolean {
        return this.pricecheck['1'] !== undefined;
    }

    private static removeJob(): void {
        delete this.pricecheck['1'];
    }
}

interface ErrorRequest {
    body?: ErrorBody;
    message?: string;
}

interface ErrorBody {
    message: string;
}
