import Bot from '../../Bot';

export default function craftClassWeapons(bot: Bot): Promise<void> {
    if (!bot.options.crafting.weapons.enable) {
        return;
    }
    const currencies = bot.inventoryManager.getInventory.getCurrencies(bot.craftWeapons);

    void Promise.all(
        ['scout', 'soldier', 'pyro', 'demoman', 'heavy', 'engineer', 'medic', 'sniper', 'spy'].map(classChar =>
            craftEachClassWeapons(bot, bot.craftWeaponsByClass[classChar], currencies)
        )
    );
}

function craftEachClassWeapons(bot: Bot, weapons: string[], currencies: { [sku: string]: string[] }): Promise<void> {
    return new Promise(resolve => {
        let stopLoop = false;

        for (let i = 0; i < weapons.length; i++) {
            // first loop
            // check if that weapon1 only have 1 in inventory AND it's not in pricelist
            const isWep1 = currencies[weapons[i]].length === 1 && bot.pricelist.getPrice(weapons[i], true) === null;

            for (let j = 0; j < weapons.length; j++) {
                if (j === i) {
                    // second loop inside first loop, but ignore same index (same weapons)
                    continue;
                }
                const isWep2 = currencies[weapons[j]].length === 1 && bot.pricelist.getPrice(weapons[j], true) === null;

                if (isWep1 && isWep2) {
                    // if both are different weapons and both wep1 and wep2 conditions are true, call combine function
                    bot.tf2gc.combineClassWeapon([weapons[i], weapons[j]]);
                    stopLoop = true;
                    break;
                }
            }

            if (stopLoop) {
                break;
            }
        }
        return resolve();
    });
}
