import Bot from '../../Bot';

import { craftAll } from '../../../lib/data';

export default function craftDuplicateWeapons(bot: Bot): Promise<void> {
    return new Promise(resolve => {
        if (!bot.options.crafting.weapons.enable) {
            return resolve();
        }
        const currencies = bot.inventoryManager.getInventory.getCurrencies(bot);

        for (const sku of craftAll) {
            const weapon = currencies[sku].length;

            if (weapon >= 2 && bot.pricelist.getPrice(sku, true) === null) {
                // Only craft if duplicated and not exist in pricelist
                const combineWeapon = Math.trunc(weapon / 2);

                for (let i = 0; i < combineWeapon; i++) {
                    // give a little time between each craft job
                    bot.tf2gc.combineWeapon(sku);
                }
            }
        }

        return resolve();
    });
}
