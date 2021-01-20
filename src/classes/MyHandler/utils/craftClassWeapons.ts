import Bot from '../../Bot';

export default function craftClassWeapons(bot: Bot): Promise<void> {
    if (!bot.options.crafting.weapons.enable) {
        return;
    }
    const currencies = bot.inventoryManager.getInventory.getCurrencies;

    void Promise.all([
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Scout') as string[], currencies),
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Soldier') as string[], currencies),
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Pyro') as string[], currencies),
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Demoman') as string[], currencies),
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Heavy') as string[], currencies),
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Engineer') as string[], currencies),
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Medic') as string[], currencies),
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Sniper') as string[], currencies),
        craftEachClassWeapons(bot, bot.schema.getWeaponsForCraftingByClass('Spy') as string[], currencies)
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
