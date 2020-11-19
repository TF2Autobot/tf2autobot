import Bot from '../Bot';
import Currencies from 'tf2-currencies';
import log from '../../lib/logger';
import { EntryData, PricelistChangedSource } from '../Pricelist';
import { scrapAdjustment } from './userSettings';

export default function createToSell(minKeys: number, maxKeys: number, bot: Bot): void {
    const keyPrices = bot.pricelist.getKeyPrices();
    let entry;

    if (keyPrices.src !== 'manual' && !scrapAdjustment.enabled) {
        entry = {
            sku: '5021;6',
            enabled: true,
            autoprice: true,
            min: minKeys,
            max: maxKeys,
            intent: 1,
            note: {
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + process.env.BPTF_DETAILS_BUY,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + process.env.BPTF_DETAILS_SELL
            }
        } as any;
    } else if (keyPrices.src === 'manual' && !scrapAdjustment.enabled) {
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
            intent: 1,
            note: {
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + process.env.BPTF_DETAILS_BUY,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + process.env.BPTF_DETAILS_SELL
            }
        } as any;
    } else if (scrapAdjustment.enabled) {
        entry = {
            sku: '5021;6',
            enabled: true,
            autoprice: false,
            sell: {
                keys: 0,
                metal: Currencies.toRefined(keyPrices.sell.toValue() - scrapAdjustment.value)
            },
            buy: {
                keys: 0,
                metal: Currencies.toRefined(keyPrices.buy.toValue() - scrapAdjustment.value)
            },
            min: minKeys,
            max: maxKeys,
            intent: 1,
            note: {
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + process.env.BPTF_DETAILS_BUY,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + process.env.BPTF_DETAILS_SELL
            }
        } as any;
    }
    bot.pricelist
        .addPrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
        .then(data => {
            log.debug(`✅ Automatically added Mann Co. Supply Crate Key to sell.`);
            bot.listings.checkBySKU(data.sku, data);
        })
        .catch(err => {
            log.warn(`❌ Failed to add Mann Co. Supply Crate Key to sell automatically: ${err.message}`);
        });
}
