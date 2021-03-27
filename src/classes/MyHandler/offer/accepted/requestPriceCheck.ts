import sleepasync from 'sleep-async';
import { RequestCheckFn, RequestCheckResponse } from '../../../Pricer';
import Bot from '../../../Bot';
import log from '../../../../lib/logger';

export default async function pricecheck(bot: Bot, skus: string[], requestCheck: RequestCheckFn): Promise<void> {
    for (const sku of skus) {
        if (sku === '5021;6') {
            continue;
        }

        await sleepasync().Promise.sleep(2 * 1000);

        // Update listings (exclude weapons/pure)
        bot.listings.checkBySKU(sku, null, false, true);

        void requestCheck(sku, 'bptf').asCallback((err, body: RequestCheckResponse) => {
            if (err) {
                log.debug(`❌ Failed to request pricecheck for ${sku}: ${JSON.stringify(err)}`);
            } else {
                log.debug(`✅ Requested pricecheck for ${body.name} (${sku}).`);
            }
        });
    }
}
