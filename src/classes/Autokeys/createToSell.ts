import Currencies from 'tf2-currencies';

import { genScrapAdjustment } from './userSettings';

import Bot from '../Bot';
import { EntryData, PricelistChangedSource } from '../Pricelist';

import log from '../../lib/logger';

export default function createToSell(minKeys: number, maxKeys: number, bot: Bot): void {
    const opt = bot.options;

    const scrapAdjustment = genScrapAdjustment(opt.autokeys.scrapAdjustment.value, opt.autokeys.scrapAdjustment.enable);
    const keyPrices = bot.pricelist.getKeyPrices;
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
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.buy,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.sell
            }
        } as EntryData;
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
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.buy,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.sell
            }
        } as EntryData;
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
                buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.buy,
                sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.details.sell
            }
        } as EntryData;
    }
    bot.pricelist
        .addPrice(entry, true, PricelistChangedSource.Autokeys)
        .then(() => {
            log.debug(`✅ Automatically added Mann Co. Supply Crate Key to sell.`);
        })
        .catch((err: Error) => {
            log.warn(`❌ Failed to add Mann Co. Supply Crate Key to sell automatically: ${err.message}`);
        });
}
