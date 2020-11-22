import Currencies from 'tf2-currencies';

import { genScrapAdjustment } from './userSettings';

import Bot from '../Bot';
import { EntryData, PricelistChangedSource } from '../Pricelist';

import log from '../../lib/logger';

export default function updateToBuy(minKeys: number, maxKeys: number, bot: Bot): void {
    const keyPrices = bot.pricelist.getKeyPrices();
    let entry;
    const scrapAdjustment = genScrapAdjustment(bot.options.scrapAdjustmentValue, bot.options.disableScrapAdjustment);
    if (keyPrices.src !== 'manual' && !scrapAdjustment.enabled) {
        entry = {
            sku: '5021;6',
            enabled: true,
            autoprice: true,
            min: minKeys,
            max: maxKeys,
            intent: 0,
            note: {
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + bot.options.bptfDetailsBuy,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + bot.options.bptfDetailsSell
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
            intent: 0,
            note: {
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + bot.options.bptfDetailsBuy,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + bot.options.bptfDetailsSell
            }
        } as any;
    } else if (scrapAdjustment.enabled) {
        entry = {
            sku: '5021;6',
            enabled: true,
            autoprice: false,
            sell: {
                keys: 0,
                metal: Currencies.toRefined(keyPrices.sell.toValue() + scrapAdjustment.value)
            },
            buy: {
                keys: 0,
                metal: Currencies.toRefined(keyPrices.buy.toValue() + scrapAdjustment.value)
            },
            min: minKeys,
            max: maxKeys,
            intent: 0,
            note: {
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + bot.options.bptfDetailsBuy,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + bot.options.bptfDetailsSell
            }
        } as any;
    }
    bot.pricelist
        .updatePrice(entry as EntryData, false, PricelistChangedSource.Autokeys)
        .then(data => {
            log.debug(`✅ Automatically update Mann Co. Supply Crate Key to buy.`);
            bot.listings.checkBySKU(data.sku, data);
        })
        .catch(err => {
            log.warn(`❌ Failed to update Mann Co. Supply Crate Key to buy automatically: ${err.message}`);
        });
}
