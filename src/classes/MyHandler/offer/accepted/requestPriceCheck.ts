import sleepasync from 'sleep-async';
import { RequestCheckFn, RequestCheckResponse } from '../../../Pricer';
import log from '../../../../lib/logger';

export default async function pricecheck(skus: string[], requestCheck: RequestCheckFn): Promise<void> {
    for (const sku of skus) {
        await sleepasync().Promise.sleep(2 * 1000);
        void requestCheck(sku, 'bptf').asCallback((err, body: RequestCheckResponse) => {
            if (err) {
                log.debug(`❌ Failed to request pricecheck for ${sku}: ${JSON.stringify(err)}`);
            } else {
                log.debug(`✅ Requested pricecheck for ${body.name} (${sku}).`);
            }
        });
    }
}
