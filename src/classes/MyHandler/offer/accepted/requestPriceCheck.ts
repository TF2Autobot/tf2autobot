import sleepasync from 'sleep-async';
import { RequestCheckFn, RequestCheckResponse } from '../../../Pricer';
import Bot from '../../../Bot';
import log from '../../../../lib/logger';
import { UnknownDictionary } from '../../../../types/common';

export default class PriceCheckQueue {
    private static priceUpdate: UnknownDictionary<string> = {};

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
        this.priceUpdate[Date.now()] = sku;

        void this.process();
    }

    private static dequeue(): void {
        delete this.priceUpdate[this.first()];
    }

    private static first(): string {
        return Object.keys(this.priceUpdate)[0];
    }

    private static size(): number {
        return Object.keys(this.priceUpdate).length;
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

        void this.requestCheck(sku, 'bptf').asCallback((err, body: RequestCheckResponse) => {
            if (err) {
                log.debug(`❌ Failed to request pricecheck for ${sku}: ${JSON.stringify(err)}`);
            } else {
                log.debug(`✅ Requested pricecheck for ${body.name} (${sku}).`);
            }

            this.isProcessing = false;
            this.dequeue();
            void this.process();
        });
    }
}
