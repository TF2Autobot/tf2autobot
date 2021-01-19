import Currencies from 'tf2-currencies';
import { genScrapAdjustment } from './userSettings';
import Bot from '../Bot';
import { EntryData, PricelistChangedSource } from '../Pricelist';
import log from '../../lib/logger';
import sendAlert from '../../lib/DiscordWebhook/sendAlert';

export default function createToBuy(minKeys: number, maxKeys: number, bot: Bot): void {
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
        intent: 0,
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
            metal: Currencies.toRefined(keyPrices.buy.toValue() + scrapAdjustment.value)
        };
        entry.sell = {
            keys: 0,
            metal: Currencies.toRefined(keyPrices.sell.toValue() + scrapAdjustment.value)
        };
    }

    bot.pricelist
        .addPrice(entry, true, PricelistChangedSource.Autokeys)
        .then(() => log.debug(`✅ Automatically added Mann Co. Supply Crate Key to buy.`))
        .catch(err => {
            const opt2 = bot.options;
            const msg = `❌ Failed to add Mann Co. Supply Crate Key to buy automatically: ${(err as Error).message}`;
            log.warn(msg);

            if (opt2.sendAlert.enable && opt2.sendAlert.autokeys.failedToAdd) {
                if (opt2.discordWebhook.sendAlert.enable && opt2.discordWebhook.sendAlert.url !== '') {
                    sendAlert('autokeys-failedToAdd-buy', bot, msg);
                } else bot.messageAdmins(msg, []);
            }
        });
}
