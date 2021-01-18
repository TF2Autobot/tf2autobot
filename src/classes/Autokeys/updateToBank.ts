import Bot from '../Bot';
import { EntryData, PricelistChangedSource } from '../Pricelist';
import log from '../../lib/logger';

export default function updateToBank(minKeys: number, maxKeys: number, bot: Bot): void {
    const opt = bot.options.details;
    const keyPrices = bot.pricelist.getKeyPrices;

    const entry: EntryData = {
        sku: '5021;6',
        enabled: true,
        autoprice: true,
        min: minKeys,
        max: maxKeys,
        intent: 2,
        note: {
            buy: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.buy,
            sell: '[𝐀𝐮𝐭𝐨𝐤𝐞𝐲𝐬] ' + opt.sell
        }
    };

    if (keyPrices.src === 'manual') {
        entry.autoprice = false;
        entry.buy = {
            keys: 0,
            metal: keyPrices.buy.metal
        };
        entry.sell = {
            keys: 0,
            metal: keyPrices.sell.metal
        };
    }

    bot.pricelist
        .updatePrice(entry, true, PricelistChangedSource.Autokeys)
        .then(() => log.debug(`✅ Automatically updated Mann Co. Supply Crate Key to bank.`))
        .catch(err =>
            log.warn(`❌ Failed to update Mann Co. Supply Crate Key to bank automatically: ${JSON.stringify(err)}`)
        );
}
