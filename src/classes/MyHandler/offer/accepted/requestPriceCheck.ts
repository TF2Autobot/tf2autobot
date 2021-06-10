import sleepasync from 'sleep-async';
import { RequestCheckFn, RequestCheckResponse } from '../../../Pricer';
import Bot from '../../../Bot';
import log from '../../../../lib/logger';

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
        this.skus.push(sku);

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

        await sleepasync().Promise.sleep(2000);

        // Update listings (exclude weapons/pure)
        this.bot.listings.checkBySKU(sku, null, false, true);

        if (sku === '5021;6') {
            this.isProcessing = false;
            this.dequeue();
            return void this.process();
        }

        void this.requestCheck(sku, 'bptf').asCallback((err, body: RequestCheckResponse) => {
            if (err) {
                const errStringify = JSON.stringify(err);
                const errMessage = errStringify === '' ? (err as Error)?.message : errStringify;
                log.warn(`❌ Failed to request pricecheck for ${sku}: ${errMessage}`);
            } else {
                log.debug(`✅ Requested pricecheck for ${body.name} (${sku}).`);
            }

            this.isProcessing = false;
            this.dequeue();
            void this.process();
        });
    }
}
