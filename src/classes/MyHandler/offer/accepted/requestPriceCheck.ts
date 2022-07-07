import * as timersPromises from 'timers/promises';
import { RequestCheckFn, RequestCheckResponse } from '../../../IPricer';
import Bot from '../../../Bot';
import log from '../../../../lib/logger';
import SKU from '@tf2autobot/tf2-sku';

export default class PriceCheckQueue {
    private static skus: string[] = [];

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
        this.skus.push(sku.replace(/;[p][0-9]+/, ''));

        void this.process();
    }

    private static dequeue(): void {
        this.skus.shift();
    }

    private static first(): string {
        return this.skus[0];
    }

    private static size(): number {
        return this.skus.length;
    }

    private static async process(): Promise<void> {
        const sku = this.first();

        if (sku === undefined || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        await timersPromises.setTimeout(2000);

        // Update listings (exclude weapons/pure)
        this.bot.listings.checkByPriceKey(sku, null, false, true);

        if (sku === '5021;6') {
            this.isProcessing = false;
            this.dequeue();
            return void this.process();
        }

        void this.requestCheck(sku)
            .then((body: RequestCheckResponse) => {
                let name: string;
                if (body.name) {
                    name = body.name;
                } else {
                    name = this.bot.schema.getName(SKU.fromString(sku));
                }
                log.debug(`✅ Requested pricecheck for ${name} (${sku}).`);
            })
            .catch(err => {
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                log.warn(`❌ Failed to request pricecheck for ${sku}: ${errMessage}`);
            })
            .finally(() => {
                this.isProcessing = false;
                this.dequeue();
                void this.process();
            });
    }
}
