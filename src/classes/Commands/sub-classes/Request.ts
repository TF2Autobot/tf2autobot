import SteamID from 'steamid';
import SKU from 'tf2-sku-2';
import pluralize from 'pluralize';
import dayjs from 'dayjs';
import sleepasync from 'sleep-async';
import Currencies from 'tf2-currencies-2';
import { removeLinkProtocol, getItemFromParams, fixSKU } from '../functions/utils';
import Bot from '../../Bot';
import CommandParser from '../../CommandParser';
import log from '../../../lib/logger';
import { fixItem } from '../../../lib/items';
import { testSKU } from '../../../lib/tools/export';
import { UnknownDictionary } from '../../../types/common';
import Pricer, { GetPriceFn, RequestCheckFn, RequestCheckResponse } from '../../Pricer';

export default class RequestCommands {
    private requestCheck: RequestCheckFn;

    private getPrice: GetPriceFn;

    constructor(private readonly bot: Bot, private priceSource: Pricer) {
        this.bot = bot;

        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.requestCheck = this.priceSource.requestCheck;
        // eslint-disable-next-line @typescript-eslint/unbound-method
        this.getPrice = this.priceSource.getPrice;

        Pricecheck.setRequestCheckFn(this.requestCheck);
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async getSnapshotsCommand(steamID: SteamID, message: string): Promise<void> {
        return this.bot.sendMessage(steamID, '❌ This command is disabled');
    }

    pricecheckCommand(steamID: SteamID, message: string): void {
        const params = CommandParser.parseParams(CommandParser.removeCommand(removeLinkProtocol(message)));
        if (params.sku !== undefined && !testSKU(params.sku as string)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), this.bot.schema));
        }

        params.sku = fixSKU(params.sku);

        void this.requestCheck(params.sku, 'bptf').asCallback((err: ErrorRequest, body: RequestCheckResponse) => {
            if (err) {
                return this.bot.sendMessage(
                    steamID,
                    `❌ Error while requesting price check: ${
                        err.body && err.body.message ? err.body.message : err.message
                    }`
                );
            }

            if (!body) {
                this.bot.sendMessage(steamID, '❌ Error while requesting price check (returned null/undefined)');
            } else {
                this.bot.sendMessage(steamID, `✅ Requested pricecheck for ${body.name}, the item will be checked.`);
            }
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
        if (params.sku !== undefined && !testSKU(params.sku as string)) {
            return this.bot.sendMessage(steamID, `❌ "sku" should not be empty or wrong format.`);
        }

        if (params.sku === undefined) {
            const item = getItemFromParams(steamID, params, this.bot);
            if (item === null) {
                return;
            }

            params.sku = SKU.fromObject(item);
        } else {
            params.sku = SKU.fromObject(fixItem(SKU.fromString(params.sku), this.bot.schema));
        }

        params.sku = fixSKU(params.sku);

        const customUrl = this.bot.options.customPricerUrl;
        const name = this.bot.schema.getName(SKU.fromString(params.sku));
        try {
            const price = await this.getPrice(params.sku, 'bptf');
            const currBuy = new Currencies(price.buy);
            const currSell = new Currencies(price.sell);

            this.bot.sendMessage(
                steamID,
                `🔎 ${name}:\n• Buy  : ${currBuy.toString()}\n• Sell : ${currSell.toString()}\n\n${
                    customUrl !== 'https://api.prices.tf' ? `Link: ${customUrl}` : 'Prices.TF: https://prices.tf'
                }/items/${params.sku as string}`
            );
        } catch (err) {
            return this.bot.sendMessage(
                steamID,
                `Error getting price for ${name === null ? (params.sku as string) : name}: ${
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
        await sleepasync().Promise.sleep(2000);

        void Pricecheck.requestCheck(this.sku, 'bptf').asCallback(err => {
            if (err) {
                this.submitted++;
                this.failed++;
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                log.warn(`pricecheck failed for ${this.sku}: ${errMessage}`);
                log.debug(
                    `pricecheck for ${this.sku} failed, status: ${this.submitted}/${this.remaining}, ${this.success} success, ${this.failed} failed.`
                );
            } else {
                this.submitted++;
                this.success++;
                log.debug(
                    `pricecheck for ${this.sku} success, status: ${this.submitted}/${this.remaining}, ${this.success} success, ${this.failed} failed.`
                );
            }

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

interface Sales {
    seller: string;
    itemHistory: string;
    keys: number;
    metal: number;
    date: number;
}

interface ErrorRequest {
    body?: ErrorBody;
    message?: string;
}

interface ErrorBody {
    message: string;
}
