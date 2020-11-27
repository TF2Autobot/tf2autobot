import Bot from '../Bot';
import { EntryData, PricelistChangedSource } from '../Pricelist';

import log from '../../lib/logger';

export default function createToBank(minKeys: number, maxKeys: number, bot: Bot): void {
    const keyPrices = bot.pricelist.getKeyPrices();
    const opt = bot.options;
    let entry;

    if (keyPrices.src !== 'manual') {
        entry = {
            sku: '5021;6',
            enabled: true,
            autoprice: true,
            min: minKeys,
            max: maxKeys,
            intent: 2,
            note: {
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.buy,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.sell
            }
        } as any;
    } else {
        entry = {
            sku: '5021;6',
            enabled: true,
            autoprice: false,
            sell: {
                keys: 0,
                metal: keyPrices.sell.metal
            },
            buy: {
                keys: 0,
                metal: keyPrices.buy.metal
            },
            min: minKeys,
            max: maxKeys,
            intent: 2,
            note: {
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.buy,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.sell
            }
        } as any;
    }
    bot.pricelist
        .addPrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
        .then(data => {
            log.debug(`✅ Automatically added Mann Co. Supply Crate Key to bank.`);
            bot.listings.checkBySKU(data.sku, data);
        })
        .catch(err => {
            log.warn(`❌ Failed to add Mann Co. Supply Crate Key to bank automatically: ${err.message}`);
        });
}
