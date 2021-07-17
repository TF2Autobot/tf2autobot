import sleepasync from 'sleep-async';
import Bot from '../../../Bot';
import log from '../../../../lib/logger';

interface Asset {
    sku: string;
    assetid: string;
}

export default class RemoveCustomTextureQueue {
    private static assets: Asset[] = [];

    private static bot: Bot;

    static setBot(bot: Bot): void {
        this.bot = bot;
    }

    private static isProcessing = false;

    static enqueue(sku: string, assetid: string): void {
        this.assets.push({ sku, assetid });

        void this.process();
    }

    private static dequeue(): void {
        this.assets.shift();
    }

    private static first(): Asset {
        return this.assets[0];
    }

    private static async process(): Promise<void> {
        const asset = this.first();

        if (asset === undefined || this.isProcessing) {
            return;
        }

        this.isProcessing = true;

        await sleepasync().Promise.sleep(2000);

        const sku = asset.sku;
        const assetid = asset.assetid;
        this.bot.tf2gc.removeDecal(sku, assetid, err => {
            if (err) {
                log.error(`Error remove custom texture for ${sku} (${assetid})`, err);
            }

            this.isProcessing = false;
            this.dequeue();
            void this.process();
        });
    }
}
