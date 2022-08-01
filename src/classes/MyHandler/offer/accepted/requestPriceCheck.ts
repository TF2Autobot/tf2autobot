import * as timersPromises from 'timers/promises';
import { RequestCheckFn } from '../../../IPricer';
import Bot from '../../../Bot';
import log from '../../../../lib/logger';
import SKU from '@tf2autobot/tf2-sku';

export default class PriceCheckQueue {
    private static skus: Set<string> = new Set();

    private static requestCheck: RequestCheckFn;

    static setRequestCheckFn(fn: RequestCheckFn): void {
        this.requestCheck = fn;
    }

    private static bot: Bot;

    static setBot(bot: Bot): void {
        this.bot = bot;
    }

    private static isProcessing = false;

    static enqueue(sku: string): void {
        this.skus.add(sku.replace(/;[p][0-9]+/, ''));

        void this.process();
    }

    private static next(): string | undefined {
        let result: string | undefined = undefined;
        for (const sku of this.skus) {
            result = sku;
            break;
        }
        return result;
    }

    private static async process(): Promise<void> {
        const sku = this.next();

        if (sku === undefined || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        await timersPromises.setTimeout(2000);

        // Update listings (exclude weapons/pure)
        this.bot.listings.checkByPriceKey({ priceKey: sku, checkGenerics: false, showLogs: true });

        if (sku === '5021;6') {
            this.isProcessing = false;
            this.skus.delete(sku);
            return await this.process();
        }

        try {
            const body = await this.requestCheck(sku);
            let name: string;
            if (body.name) {
                name = body.name;
            } else {
                name = this.bot.schema.getName(SKU.fromString(sku));
            }
            log.debug(`✅ Requested pricecheck for ${name} (${sku}).`);
        } catch (err) {
            const errStringify = JSON.stringify(err);
            const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
            log.warn(`❌ Failed to request pricecheck for ${sku}: ${errMessage}`);
        }
        this.isProcessing = false;
        this.skus.delete(sku);
        await this.process();
    }
}
