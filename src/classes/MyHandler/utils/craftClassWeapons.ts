import Bot from '../../Bot';

export default function craftClassWeapons(bot: Bot): Promise<void> {
    if (!bot.options.crafting.weapons.enable) {
        return;
    }
    const currencies = bot.inventoryManager.getInventory.getCurrencies(bot.craftWeapons);

    void Promise.all([
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.scout, currencies),
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.soldier, currencies),
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.pyro, currencies),
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.demoman, currencies),
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.heavy, currencies),
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.engineer, currencies),
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.medic, currencies),
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.sniper, currencies),
        craftEachClassWeapons(bot, bot.craftWeaponsByClass.spy, currencies)
    ]);
}

function craftEachClassWeapons(bot: Bot, weapons: string[], currencies: { [sku: string]: string[] }): Promise<void> {
    return new Promise(resolve => {
        weapons.forEach((sku1, i) => {
            // first loop
            // check if that weapon1 only have 1 in inventory AND it's not in pricelist
            const isWep1 = currencies[sku1].length === 1 && bot.pricelist.getPrice(sku1, true) === null;

            weapons.forEach((sku2, j) => {
                // second loop inside first loop, but ignore same index (same weapons)
                if (j !== i) {
                    // check if that weapon2 only have 1 in inventory AND it's not in pricelist
                    const isWep2 = currencies[sku2].length === 1 && bot.pricelist.getPrice(sku2, true) === null;
                    if (isWep1 && isWep2) {
                        // if both are different weapons and both wep1 and wep2 conditions are true, call combine function
                        bot.tf2gc.combineClassWeapon([sku1, sku2]);
                        // break
                        return resolve();
                    }
                }
            });
        });

        return resolve();
    });
}
