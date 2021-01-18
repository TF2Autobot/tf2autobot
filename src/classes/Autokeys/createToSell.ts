import Currencies from 'tf2-currencies';
import { genScrapAdjustment } from './userSettings';
import Bot from '../Bot';
import { EntryData, PricelistChangedSource } from '../Pricelist';
import log from '../../lib/logger';

export default function createToSell(minKeys: number, maxKeys: number, bot: Bot): void {
    const optSA = bot.options.autokeys.scrapAdjustment;
    const optD = bot.options.details;
    const keyPrices = bot.pricelist.getKeyPrices;
    const scrapAdjustment = genScrapAdjustment(optSA.value, optSA.enable);

    const entry: EntryData = {
        sku: '5021;6',
        enabled: true,
        autoprice: true,
        min: minKeys,
        max: maxKeys,
        intent: 1,
        note: {
            buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + optD.buy,
            sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + optD.sell
        }
    };

    if (keyPrices.src === 'manual' && !scrapAdjustment.enabled) {
        entry.autoprice = false;
        entry.buy = {
            keys: 0,
            metal: keyPrices.buy.metal
        };
        entry.sell = {
            keys: 0,
            metal: keyPrices.sell.metal
        };
    } else if (scrapAdjustment.enabled) {
        entry.autoprice = false;
        entry.buy = {
            keys: 0,
            metal: Currencies.toRefined(keyPrices.buy.toValue() - scrapAdjustment.value)
        };
        entry.sell = {
            keys: 0,
            metal: Currencies.toRefined(keyPrices.sell.toValue() - scrapAdjustment.value)
        };
    }

    bot.pricelist
        .addPrice(entry, true, PricelistChangedSource.Autokeys)
        .then(() => log.debug(`✅ Automatically added Mann Co. Supply Crate Key to sell.`))
        .catch(err =>
            log.warn(`❌ Failed to add Mann Co. Supply Crate Key to sell automatically: ${JSON.stringify(err)}`)
        );
}
